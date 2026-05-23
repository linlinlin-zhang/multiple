import WebSocket from "ws";
import { normalizeAgentSkillId } from "../../public/agentSkills.js";
import { CANVAS_ACTION_TYPES } from "../prompts/index.js";
import { cleanString } from "./modelConfig.js";

const VOICE_ACTION_TYPES = new Set(CANVAS_ACTION_TYPES);

export function createVoiceServices({
  buildRealtimeInstruction,
  chatCompletions,
  collectChatContent,
  collectStreamingChatText,
  parseJsonFromText,
  stringOr = (value, fallback = "") => (typeof value === "string" && value ? value : fallback)
} = {}) {
  if (typeof buildRealtimeInstruction !== "function") {
    throw new Error("createVoiceServices requires buildRealtimeInstruction.");
  }
  if (typeof chatCompletions !== "function") {
    throw new Error("createVoiceServices requires chatCompletions.");
  }
  if (typeof collectChatContent !== "function") {
    throw new Error("createVoiceServices requires collectChatContent.");
  }
  if (typeof collectStreamingChatText !== "function") {
    throw new Error("createVoiceServices requires collectStreamingChatText.");
  }
  if (typeof parseJsonFromText !== "function") {
    throw new Error("createVoiceServices requires parseJsonFromText.");
  }

  async function transcribeAudio(config, audioDataUrl, language) {
    if (isDashScopeLiveTranslateConfig(config)) {
      return dashScopeLiveTranslateTranscription(config, audioDataUrl, language);
    }

    const parsed = parseDataUrl(audioDataUrl);
    const ext = extensionFromMimeType(parsed.mimeType) || "webm";
    const form = new FormData();
    form.append("model", config.model);
    form.append("file", new Blob([parsed.buffer], { type: parsed.mimeType }), `speech.${ext}`);
    if (language === "zh" || language === "en") {
      form.append("language", language);
    }
    if (typeof config.temperature === "number") {
      form.append("temperature", String(config.temperature));
    }

    const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`
      },
      body: form
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text };
    }

    if (!response.ok) {
      const detail = json?.error?.message || json?.message || text || response.statusText;
      throw new Error(`${config.role} API ${response.status}: ${detail}`);
    }

    return String(json?.text || json?.transcript || json?.data?.text || "").trim();
  }

  async function dashScopeLiveTranslateTranscription(config, audioDataUrl, language) {
    const audio = dashScopeInputAudioFromDataUrl(audioDataUrl);
    const configuredTargetLang = ["zh", "en"].includes(config.options?.targetLanguage) ? config.options.targetLanguage : "";
    const targetLang = configuredTargetLang || (language === "en" ? "en" : "zh");
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: audio
              }
            ]
          }
        ],
        modalities: ["text"],
        stream: true,
        stream_options: { include_usage: false },
        translation_options: { target_lang: targetLang }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`${config.role} API ${response.status}: ${detail || response.statusText}`);
    }

    const text = await collectStreamingChatText(response);
    return text.trim();
  }

  async function realtimeVoiceCompletion(config, context) {
    if (isDashScopeRealtimeConfig(config)) {
      return dashScopeRealtimeVoiceCompletion(config, context);
    }

    const audio = audioInputFromRealtimeContext(context);
    const instruction = buildRealtimeInstruction(context);

    const response = await chatCompletions(config, {
      temperature: typeof config.temperature === "number" ? config.temperature : 0.7,
      modalities: ["text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "input_audio", input_audio: audio }
          ]
        }
      ]
    });

    const text = collectChatContent(response).trim();
    let parsed;
    try {
      parsed = parseJsonFromText(text);
    } catch {
      parsed = { transcript: "", reply: text, actions: [] };
    }

    return {
      transcript: stringOr(parsed?.transcript, ""),
      reply: stringOr(parsed?.reply, text),
      actions: normalizeVoiceActions(parsed?.actions || parsed?.action),
      audioDataUrl: extractVoiceAudioDataUrl(response)
    };
  }

  async function dashScopeRealtimeVoiceCompletion(config, context) {
    const pcmBase64 = context.pcmBase64 || pcmBase64FromAudioDataUrl(context.audioDataUrl);
    const instruction = buildRealtimeInstruction(context);
    const events = await runDashScopeRealtimeTurn(config, pcmBase64, instruction);
    const transcript = events.inputTranscript.trim();
    const responseText = (events.text || events.audioTranscript).trim();
    const audioDataUrl = events.audioChunks?.length ? wavDataUrlFromPcm16Chunks(events.audioChunks, 24000) : "";
    let parsed;
    try {
      parsed = parseJsonFromText(responseText);
    } catch {
      parsed = { transcript, reply: responseText, actions: [] };
    }

    return {
      transcript: stringOr(parsed?.transcript, transcript),
      reply: stringOr(parsed?.reply, responseText),
      actions: normalizeVoiceActions(parsed?.actions || parsed?.action),
      audioDataUrl
    };
  }

  return {
    realtimeVoiceCompletion,
    transcribeAudio
  };
}

function isDashScopeLiveTranslateConfig(config) {
  return config.provider === "dashscope-livetranslate" || /^qwen3-livetranslate/i.test(config.model || "");
}

function isDashScopeRealtimeConfig(config) {
  return config.provider === "dashscope-realtime" || /^wss:\/\//i.test(config.baseUrl || "") || /omni.*realtime|realtime/i.test(config.model || "");
}

function runDashScopeRealtimeTurn(config, pcmBase64, instruction) {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl.replace(/\/+$/, "")}?model=${encodeURIComponent(config.model)}`;
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` }
    });
    const chunks = splitBuffer(Buffer.from(pcmBase64, "base64"), 3200);
    const result = { inputTranscript: "", text: "", audioTranscript: "", audioChunks: [] };
    let settled = false;
    let audioSent = false;

    const timer = setTimeout(() => {
      finish(new Error(`${config.role} API timeout waiting for realtime response.`));
    }, 45000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // Ignore close errors.
      }
      if (error) reject(error);
      else resolve(result);
    }

    function send(event) {
      ws.send(JSON.stringify({
        event_id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...event
      }));
    }

    function sendAudioTurn() {
      if (audioSent) return;
      audioSent = true;
      for (const chunk of chunks) {
        send({ type: "input_audio_buffer.append", audio: chunk.toString("base64") });
      }
      send({ type: "input_audio_buffer.commit" });
      send({ type: "response.create" });
    }

    ws.on("open", () => {
      const outputAudio = config.options?.outputAudio === true;
      const session = {
        modalities: outputAudio ? ["text", "audio"] : ["text"],
        instructions: instruction,
        input_audio_format: "pcm",
        output_audio_format: "pcm",
        input_audio_transcription: { model: cleanString(config.options?.transcriptionModel, 120) || "qwen3-asr-flash-realtime" },
        turn_detection: null
      };
      if (outputAudio) {
        session.voice = cleanString(config.options?.voice, 64) || "Ethan";
      }
      if (config.options?.enableSearch === true) {
        session.enable_search = true;
        session.search_options = { enable_source: true };
      }
      if (config.options?.smoothOutput === true || config.options?.smoothOutput === false) {
        session.smooth_output = config.options.smoothOutput;
      }
      if (typeof config.temperature === "number") {
        session.temperature = config.temperature;
      }
      if (typeof config.options?.top_p === "number") {
        session.top_p = config.options.top_p;
      }
      send({
        type: "session.update",
        session
      });
    });

    ws.on("message", (data) => {
      let event;
      try {
        event = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (event.type) {
        case "error":
          finish(new Error(event.error?.message || JSON.stringify(event.error || event)));
          break;
        case "session.updated":
          sendAudioTurn();
          break;
        case "conversation.item.input_audio_transcription.completed":
          result.inputTranscript = event.transcript || result.inputTranscript;
          break;
        case "response.text.delta":
          result.text += event.delta || "";
          break;
        case "response.audio_transcript.delta":
          result.audioTranscript += event.delta || "";
          break;
        case "response.audio_transcript.done":
          if (event.transcript && !result.audioTranscript) result.audioTranscript = event.transcript;
          break;
        case "response.audio.delta":
          if (event.delta) result.audioChunks.push(event.delta);
          break;
        case "response.done":
          finish();
          break;
        default:
          break;
      }
    });

    ws.on("error", (error) => finish(error));
    ws.on("close", () => {
      if (!settled && audioSent) finish();
    });
  });
}

function splitBuffer(buffer, size) {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(buffer.subarray(i, i + size));
  }
  return chunks;
}

function wavDataUrlFromPcm16Chunks(base64Chunks, sampleRate = 24000) {
  const pcm = Buffer.concat(
    base64Chunks
      .filter((chunk) => typeof chunk === "string" && chunk)
      .map((chunk) => Buffer.from(chunk, "base64"))
  );
  if (!pcm.length) return "";
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return `data:audio/wav;base64,${Buffer.concat([header, pcm]).toString("base64")}`;
}

function pcmBase64FromAudioDataUrl(audioDataUrl) {
  const parsed = parseDataUrl(audioDataUrl);
  if (audioFormatFromMimeType(parsed.mimeType) !== "pcm") {
    throw new Error("DashScope realtime requires 16kHz 16-bit mono PCM audio.");
  }
  return parsed.buffer.toString("base64");
}

function audioInputFromDataUrl(audioDataUrl) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(audioDataUrl);
  if (!match) {
    throw new Error("Invalid audio data URL.");
  }
  return {
    data: match[2],
    format: audioFormatFromMimeType(match[1])
  };
}

function audioInputFromRealtimeContext(context) {
  if (isAudioDataUrl(context?.audioDataUrl)) return audioInputFromDataUrl(context.audioDataUrl);
  if (isBase64Payload(context?.pcmBase64)) {
    return audioInputFromDataUrl(wavDataUrlFromPcm16Chunks([context.pcmBase64], Number(context.sampleRate) || 16000));
  }
  throw new Error("Realtime voice requires audioDataUrl or pcmBase64.");
}

function dashScopeInputAudioFromDataUrl(audioDataUrl) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,[a-zA-Z0-9+/=]+$/i.exec(audioDataUrl);
  if (!match) {
    throw new Error("Invalid audio data URL.");
  }
  return {
    data: audioDataUrl,
    format: audioFormatFromMimeType(match[1])
  };
}

function audioFormatFromMimeType(mimeType) {
  const normalized = String(mimeType || "").split(";")[0].trim().toLowerCase();
  return {
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/pcm": "pcm",
    "audio/l16": "pcm"
  }[normalized] || "webm";
}

function parseDataUrl(value) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(String(value || ""));
  if (!match) {
    throw new Error("Invalid data URL.");
  }
  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64")
  };
}

function normalizedActionString(value, maxLength = 160) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizedActionStringArray(value, maxItems = 6, maxLength = 160) {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => normalizedActionString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return items.length ? items : undefined;
}

function normalizedActionNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizedActionBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizedActionContent(value) {
  if (!value) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // A plain string is a valid note-like payload and can be repaired later.
  }
  return { text };
}

export function normalizeVoiceActions(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw
    .map((action) => {
      if (typeof action === "string") return { type: action };
      if (!action || typeof action !== "object") return null;
      const normalized = {
        type: String(action.type || action.name || "").trim(),
        nodeId: normalizedActionString(action.nodeId, 120),
        parentNodeId: normalizedActionString(action.parentNodeId, 120),
        anchorNodeId: normalizedActionString(action.anchorNodeId, 120),
        nodeName: normalizedActionString(action.nodeName || action.nameText, 160),
        parentNodeName: normalizedActionString(action.parentNodeName, 160),
        anchorNodeName: normalizedActionString(action.anchorNodeName, 160),
        target: normalizedActionString(action.target, 160),
        title: normalizedActionString(action.title, 120),
        description: normalizedActionString(action.description, 700),
        prompt: normalizedActionString(action.prompt, 1600),
        query: normalizedActionString(action.query, 360),
        url: normalizedActionString(action.url, 512),
        imageDataUrl: normalizedActionString(action.imageDataUrl, 200000),
        imageUrl: normalizedActionString(action.imageUrl, 1024),
        referenceImageUrl: normalizedActionString(action.referenceImageUrl, 1024),
        position: normalizedActionString(action.position, 60),
        direction: normalizedActionString(action.direction, 60),
        mode: normalizedActionString(action.mode, 80),
        scope: normalizedActionString(action.scope, 80),
        layoutHint: normalizedActionString(action.layoutHint, 80),
        role: normalizedActionString(action.role, 80),
        skill: normalizeAgentSkillId(action.skill || action.agentSkill),
        deliverable: normalizedActionString(action.deliverable, 360),
        successCriteria: normalizedActionString(action.successCriteria, 500),
        priority: normalizedActionString(action.priority, 40),
        dependencies: normalizedActionStringArray(action.dependencies, 6, 140),
        nodeType: normalizedActionString(action.nodeType, 40) || undefined,
        content: normalizedActionContent(action.content),
        batchIndex: normalizedActionNumber(action.batchIndex),
        batchSize: normalizedActionNumber(action.batchSize),
        x: normalizedActionNumber(action.x),
        y: normalizedActionNumber(action.y),
        dx: normalizedActionNumber(action.dx),
        dy: normalizedActionNumber(action.dy),
        scale: normalizedActionNumber(action.scale),
        amount: normalizedActionNumber(action.amount),
        avoidOverlap: normalizedActionBoolean(action.avoidOverlap)
      };
      Object.keys(normalized).forEach((key) => {
        if (normalized[key] === undefined) delete normalized[key];
      });
      return normalized;
    })
    .filter((action) => action && VOICE_ACTION_TYPES.has(action.type));
}

function extractVoiceAudioDataUrl(response) {
  const audio =
    response?.choices?.[0]?.message?.audio ||
    response?.audio ||
    response?.output_audio ||
    null;
  const data = audio?.data || audio?.b64_json || audio?.content;
  if (typeof data !== "string" || !data) return "";
  const format = audio?.format || "wav";
  const mime = {
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    mp4: "audio/mp4"
  }[String(format).toLowerCase()] || "audio/wav";
  return `data:${mime};base64,${data}`;
}

function isAudioDataUrl(value) {
  return typeof value === "string" && /^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,[a-zA-Z0-9+/=]+$/i.test(value);
}

function isBase64Payload(value) {
  return typeof value === "string" && value.length > 0 && /^[a-zA-Z0-9+/=]+$/.test(value);
}
