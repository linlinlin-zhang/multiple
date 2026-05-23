export function createChatStreamHandler({
  attachContextBudgetDetails,
  buildChatResultFromResponse,
  emergencyFitChatPayloadToModelBudget,
  ingestChatTurn,
  isRequestBodyTooLargeError,
  persistActionTraceSummary,
  runtimeConfigs,
  streamChatCompletions,
  streamQwenResponses,
  writeSse
}) {
  async function handleChatStream({ payload, message, thinkingMode, agentMode, lang, selectedContext = null, canvas = {}, analysis = {}, sessionId = "", ingestMessage = "", retrievedCount = 0, webSearchEnabled = false, transport = "responses", resetPreviousResponseId = false, contextBudget = null, systemPrompt = "" }, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write("\n");
    let effectiveContextBudget = contextBudget;
    try {
      let response;
      let streamedReasoningText = "";
      const handleReasoningDelta = (delta) => {
        const text = String(delta || "");
        if (!text) return;
        streamedReasoningText += text;
        if (thinkingMode === "thinking") writeSse(res, "thinking", { delta: text });
      };
      try {
        response = await (transport === "chat-completions" ? streamChatCompletions : streamQwenResponses)(runtimeConfigs.chat, payload, {
          onReasoning: handleReasoningDelta,
          onText(delta) {
            writeSse(res, "reply", { delta });
          }
        });
      } catch (error) {
        if (!isRequestBodyTooLargeError(error)) throw error;
        effectiveContextBudget = attachContextBudgetDetails(emergencyFitChatPayloadToModelBudget(payload, runtimeConfigs.chat, {
          stream: true,
          transport,
          lang,
          previousBudget: contextBudget
        }), contextBudget);
        response = await (transport === "chat-completions" ? streamChatCompletions : streamQwenResponses)(runtimeConfigs.chat, payload, {
          onReasoning: handleReasoningDelta,
          onText(delta) {
            writeSse(res, "reply", { delta });
          }
        });
      }
      const finalPayload = buildChatResultFromResponse({
        response,
        message,
        thinkingMode,
        agentMode,
        lang,
        streamedReasoning: streamedReasoningText || response?.choices?.[0]?.message?.reasoning_content || "",
        selectedContext,
        canvas,
        analysis,
        webSearchEnabled,
        contextBudget: effectiveContextBudget,
        systemPrompt,
        sessionId
      });
      if (retrievedCount) finalPayload.retrievedContext = retrievedCount;
      if (resetPreviousResponseId) {
        delete finalPayload.responseId;
        delete finalPayload.previousResponseId;
        finalPayload.resetPreviousResponseId = true;
      }
      ingestChatTurn(sessionId, ingestMessage || message, finalPayload.reply || "").catch((e) =>
        console.warn("[handleChatStream] chat turn ingest failed:", e.message)
      );
      persistActionTraceSummary({ source: "chat_stream", sessionId, message, payload: finalPayload, transport });
      writeSse(res, "final", finalPayload);
    } catch (error) {
      writeSse(res, "error", { error: error.message || "Chat stream failed" });
    } finally {
      res.end();
    }
  }

  return {
    handleChatStream
  };
}
