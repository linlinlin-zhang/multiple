export function createMediaGenerators({
  runtimeConfigs,
  imageIncludeDataUrl = false,
  imagePollIntervalMs = 2000,
  imagePollAttempts = 30,
  videoPollIntervalMs = 15000,
  videoPollAttempts = 30,
  videoSubmitTimeoutMs = 60000
} = {}) {
  if (!runtimeConfigs) {
    throw new Error("createMediaGenerators requires runtimeConfigs.");
  }

  async function generateTokenHubImage(prompt, imageUrl, imageDataUrl) {
    const config = runtimeConfigs.image;
    const images = [];
    if (typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl)) {
      images.push(imageUrl);
    } else if (imageIncludeDataUrl && imageDataUrl) {
      images.push(imageDataUrl);
    }

    const submitPayload = {
      model: config.model,
      prompt
    };
    if (images.length) {
      submitPayload.images = images;
    }

    const submitted = await tokenHubImageRequest(config, `${config.baseUrl}/submit`, submitPayload);
    const jobId = submitted?.id;
    if (!jobId) {
      throw new Error("TokenHub image submit did not return a job id.");
    }

    for (let attempt = 0; attempt < imagePollAttempts; attempt += 1) {
      await delay(imagePollIntervalMs);
      const queried = await tokenHubImageRequest(config, `${config.baseUrl}/query`, {
        model: config.model,
        id: jobId
      });

      if (queried?.status === "completed") {
        const imageUrlResult = queried?.data?.[0]?.url;
        if (!imageUrlResult) {
          throw new Error("TokenHub image query completed without image url.");
        }
        return {
          imageUrl: imageUrlResult,
          imageDataUrl: imageUrlResult,
          revisedPrompt: queried?.data?.[0]?.revised_prompt || ""
        };
      }

      if (["failed", "error", "cancelled"].includes(String(queried?.status).toLowerCase())) {
        throw new Error(`TokenHub image job failed: ${queried?.status}`);
      }
    }

    throw new Error("TokenHub image job timed out before completion.");
  }

  async function generateDashScopeHappyHorseVideo(prompt, imageUrl, requestOptions = {}) {
    const config = runtimeConfigs.video;
    const options = config.options || {};
    const referenceImageUrl = options.useReferenceImage !== false ? publicHttpUrl(imageUrl) : "";
    const hasReferenceImage = Boolean(referenceImageUrl);
    const model = happyHorseVideoModel(config, hasReferenceImage);
    const payload = {
      model,
      input: {
        prompt: String(prompt || "").slice(0, 5000)
      },
      parameters: normalizeHappyHorseVideoParameters({ ...options, ...requestOptions }, hasReferenceImage)
    };
    if (hasReferenceImage) {
      payload.input.img_url = referenceImageUrl;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), videoSubmitTimeoutMs);
    let json;
    try {
      const response = await fetch(dashScopeVideoEndpoint(config), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const text = await response.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      if (!response.ok || json?.code) {
        const detail = json?.message || json?.error?.message || text || response.statusText;
        throw new Error(`DashScope video API ${response.status}: ${detail}`);
      }
    } finally {
      clearTimeout(timer);
    }

    const taskId = json?.output?.task_id || json?.task_id || "";
    const directVideoUrl = extractDashScopeVideoUrl(json);
    if (directVideoUrl) {
      return {
        model,
        taskId,
        status: json?.output?.task_status || "SUCCEEDED",
        videoUrl: directVideoUrl,
        revisedPrompt: json?.output?.orig_prompt || "",
        usage: json?.usage || null
      };
    }
    if (!taskId) {
      throw new Error("DashScope video response did not include a task_id.");
    }
    const result = await pollDashScopeVideoTask(config, taskId, {
      intervalMs: options.pollIntervalMs,
      attempts: options.pollAttempts
    });
    return {
      model,
      taskId,
      ...result
    };
  }

  async function generateDashScopeQwenImage(prompt, imageUrl, imageDataUrl, requestOptions = {}) {
    const config = runtimeConfigs.image;
    const options = config.options || {};
    const content = [];
    const maskDataUrl = normalizeDataUrl(requestOptions.maskDataUrl);
    const referenceImage =
      typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl)
        ? imageUrl
        : imageDataUrl;
    if (options.useReferenceImage !== false && referenceImage) {
      content.push({ image: referenceImage });
    }
    if (maskDataUrl) {
      content.push({ image: maskDataUrl });
    }
    const finalPrompt = maskDataUrl ? buildMaskedEditPrompt(prompt) : String(prompt || "");
    content.push({ text: finalPrompt.slice(0, 4000) });

    const parameters = dropUndefined({
      size: cleanSize(requestOptions.size) || cleanSize(options.size) || "2048*2048",
      n: cleanInteger(options.n, 1, 6, 1),
      prompt_extend: cleanBoolean(options.prompt_extend, true),
      watermark: cleanBoolean(options.watermark, false),
      negative_prompt: cleanString(options.negative_prompt, 500),
      seed: cleanOptionalInteger(options.seed, 0, 2147483647)
    });

    const payload = {
      model: config.model,
      input: {
        messages: [
          {
            role: "user",
            content
          }
        ]
      },
      parameters
    };

    const imageController = new AbortController();
    const imageTimeout = setTimeout(() => imageController.abort(), 120000);
    let response;
    try {
      response = await fetch(dashScopeQwenImageEndpoint(config), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: imageController.signal
      });
    } finally {
      clearTimeout(imageTimeout);
    }

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok || json?.code) {
      const detail = json?.message || json?.error?.message || text || response.statusText;
      throw new Error(`DashScope image API ${response.status}: ${detail}`);
    }

    const imageUrlResult = extractDashScopeImageUrl(json);
    if (!imageUrlResult) {
      throw new Error("DashScope image response did not include an image URL.");
    }
    return {
      imageUrl: imageUrlResult,
      imageDataUrl: imageUrlResult,
      revisedPrompt: json?.output?.actual_prompt || json?.output?.revised_prompt || "",
      usage: json?.usage || null
    };
  }

  async function pollDashScopeVideoTask(config, taskId, options = {}) {
    const intervalMs = cleanInteger(options.intervalMs, 1000, 60000, videoPollIntervalMs);
    const attempts = cleanInteger(options.attempts, 1, 120, videoPollAttempts);
    let lastStatus = "";
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await delay(intervalMs);
      const response = await fetch(dashScopeTaskEndpoint(config, taskId), {
        headers: {
          Authorization: `Bearer ${config.apiKey}`
        }
      });
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      if (!response.ok || json?.code) {
        const detail = json?.message || json?.error?.message || text || response.statusText;
        throw new Error(`DashScope task API ${response.status}: ${detail}`);
      }
      const output = json?.output || {};
      const status = output.task_status || json?.task_status || "";
      lastStatus = status || lastStatus;
      if (status === "SUCCEEDED") {
        const videoUrl = extractDashScopeVideoUrl(json);
        if (!videoUrl) throw new Error("DashScope video task succeeded without video_url.");
        return {
          status,
          videoUrl,
          revisedPrompt: output.orig_prompt || "",
          usage: json?.usage || null
        };
      }
      if (status === "FAILED" || status === "UNKNOWN") {
        const detail = output.message || output.error_message || json?.message || status;
        throw new Error(`DashScope video task ${status}: ${detail}`);
      }
    }
    throw new Error(`DashScope video task did not finish after ${attempts} polls${lastStatus ? ` (last status: ${lastStatus})` : ""}.`);
  }

  return {
    generateDashScopeHappyHorseVideo,
    generateDashScopeQwenImage,
    generateTokenHubImage
  };
}

function buildMaskedEditPrompt(prompt) {
  return [
    "图 1 是需要编辑的原图。",
    "图 2 是用户涂抹生成的黑白选区蒙版：白色区域是唯一允许修改的区域，黑色区域必须尽量保持不变。",
    "请只根据用户指令修改白色选区，保留黑色区域的构图、主体、透视、光照、材质和文字细节。",
    `用户指令：${prompt}`
  ].join("\n");
}

function happyHorseVideoModel(config, hasReferenceImage) {
  const options = config.options || {};
  if (hasReferenceImage) {
    return cleanString(options.imageModel, 120) || config.model || "happyhorse-1.0-i2v";
  }
  const configured = cleanString(options.textModel, 120) || config.model || "happyhorse-1.0-t2v";
  if (/i2v/i.test(configured)) return "happyhorse-1.0-t2v";
  return configured;
}

function normalizeHappyHorseVideoParameters(value, hasReferenceImage) {
  const resolution = String(value?.resolution || "720P").toUpperCase();
  const ratio = String(value?.ratio || "16:9");
  return dropUndefined({
    resolution: ["720P", "1080P"].includes(resolution) ? resolution : "720P",
    ratio: hasReferenceImage ? undefined : (["16:9", "9:16", "1:1", "4:3", "3:4"].includes(ratio) ? ratio : "16:9"),
    duration: cleanInteger(value?.duration, 3, 15, 5),
    watermark: cleanBoolean(value?.watermark, false),
    seed: cleanOptionalInteger(value?.seed, 0, 2147483647)
  });
}

function dashScopeVideoEndpoint(config) {
  const base = String(config.baseUrl || "").replace(/\/+$/, "");
  if (/\/api\/v1\/services\/aigc\/video-generation\/video-synthesis$/i.test(base)) return base;
  if (/\/api\/v1$/i.test(base)) return `${base}/services/aigc/video-generation/video-synthesis`;
  if (/dashscope-intl\.aliyuncs\.com/i.test(base)) {
    return "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
  }
  return "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
}

function dashScopeTaskEndpoint(config, taskId) {
  try {
    const parsed = new URL(config.baseUrl || "");
    const host = /dashscope-intl\.aliyuncs\.com/i.test(parsed.hostname)
      ? "https://dashscope-intl.aliyuncs.com"
      : "https://dashscope.aliyuncs.com";
    return `${host}/api/v1/tasks/${encodeURIComponent(taskId)}`;
  } catch {
    return `https://dashscope.aliyuncs.com/api/v1/tasks/${encodeURIComponent(taskId)}`;
  }
}

function extractDashScopeVideoUrl(response) {
  const output = response?.output || {};
  if (typeof output.video_url === "string" && output.video_url) return output.video_url;
  const results = output.results || response?.results || response?.data;
  if (Array.isArray(results)) {
    const item = results.find((part) => typeof part?.video_url === "string" || typeof part?.url === "string" || typeof part?.video === "string");
    if (item) return item.video_url || item.url || item.video;
  }
  return "";
}

function dashScopeQwenImageEndpoint(config) {
  const base = String(config.baseUrl || "").replace(/\/+$/, "");
  if (/\/api\/v1\/services\/aigc\/multimodal-generation\/generation$/i.test(base)) return base;
  if (/\/api\/v1$/i.test(base)) return `${base}/services/aigc/multimodal-generation/generation`;
  if (/dashscope-intl\.aliyuncs\.com/i.test(base)) {
    return "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  }
  return "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
}

function extractDashScopeImageUrl(response) {
  const choices = response?.output?.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      const content = choice?.message?.content;
      if (!Array.isArray(content)) continue;
      const item = content.find((part) => typeof part?.image === "string" && part.image);
      if (item) return item.image;
    }
  }
  const results = response?.output?.results || response?.results || response?.data;
  if (Array.isArray(results)) {
    const item = results.find((part) => typeof part?.url === "string" || typeof part?.image === "string");
    if (item) return item.url || item.image;
  }
  return "";
}

async function tokenHubImageRequest(config, url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const detail = json?.error?.message || json?.message || text || response.statusText;
    throw new Error(`TokenHub image API ${response.status}: ${detail}`);
  }

  return json;
}

function cleanString(value, max = 256) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function cleanInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanOptionalInteger(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanSize(value) {
  const size = cleanString(value, 32).replace(/[xX]/g, "*");
  return /^\d{3,4}\*\d{3,4}$/.test(size) ? size : "";
}

function dropUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function normalizeDataUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) && !/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(value)) {
    return null;
  }
  return value;
}

function publicHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return "";
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return "";
    const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (private172) return "";
    return raw;
  } catch {
    return "";
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
