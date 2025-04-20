import { __asyncValues } from '../utils.js';
import { log, isLoggingEnabled } from './log.js';
import { handleAPIError, MAX_RETRIES, RATE_LIMIT_RETRY_WAIT_MS } from './error-handling.js';
import { prefix } from './prefix.js';
import OpenAI, { APIConnectionTimeoutError } from 'openai';

export async function processStream(
  oai,
  model,
  instructions,
  turnInput,
  lastResponseId,
  config,
  stageItem,
  thisGeneration,
  generation,
  canceled,
  currentStream,
  pendingAborts,
  thinkingStart,
  handleFunctionCall,
  onLastResponseId,
  hardAbort
) {
  let stream;
  let newTurnInput = [];
  let newLastResponseId = lastResponseId;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let reasoning;
      if (model.startsWith("o")) {
        reasoning = { effort: "high" };
        if (model === "o3" || model === "o4-mini") reasoning.summary = "auto";
      }
      
      const mergedInstructions = [prefix, instructions].filter(Boolean).join("\n");
      if (isLoggingEnabled()) log(`instructions (length ${mergedInstructions.length}): ${mergedInstructions}`);
      
      stream = await oai.responses.create({
        model: model,
        instructions: mergedInstructions,
        previous_response_id: lastResponseId || undefined,
        input: turnInput,
        stream: true,
        parallel_tool_calls: false,
        reasoning,
        ...(config.flexMode ? { service_tier: "flex" } : {}),
        tools: [{
          type: "function",
          name: "shell",
          description: "Runs a shell command, and returns its output.",
          strict: false,
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "array",
                items: { type: "string" }
              },
              workdir: {
                type: "string",
                description: "The working directory for the command."
              },
              timeout: {
                type: "number",
                description: "The maximum time to wait for the command to complete in milliseconds."
              }
            },
            required: ["command"],
            additionalProperties: false
          }
        }]
      });
      
      break;
    } catch (error) {
      const result = await handleAPIError(error, attempt, MAX_RETRIES);
      if (result === 'retry') {
        continue;
      } else if (result === 'abort') {
        return { stream: null, newTurnInput: [], newLastResponseId };
      } else {
        throw error;
      }
    }
  }

  if (canceled || hardAbort.signal.aborted) {
    try { stream?.controller?.abort?.(); } catch (_) {}
    return { stream: null, newTurnInput: [], newLastResponseId };
  }

  try {
    try {
      for await (const event of stream) {
        if (isLoggingEnabled()) log(`processStream(): response event ${event.type}`);
        
        if (event.type === "response.output_item.done") {
          const item = event.item;
          const maybeReasoning = item;
          
          if (maybeReasoning.type === "reasoning") {
            maybeReasoning.duration_ms = Date.now() - thinkingStart;
          }
          
          if (item.type === "function_call") {
            const callId = item.call_id ?? item.id;
            if (callId) pendingAborts.add(callId);
          } else {
            stageItem(item);
          }
        }
        
        if (event.type === "response.completed") {
          if (thisGeneration === generation && !canceled) {
            for (const item of event.response.output) stageItem(item);
          }
          
          if (event.response.status === "completed") {
            newTurnInput = await processEventsWithoutStreaming(
              event.response.output,
              handleFunctionCall,
              stageItem
            );
          }
          
          newLastResponseId = event.response.id;
          onLastResponseId(event.response.id);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        if (!canceled) throw e;
        return { stream: null, newTurnInput: [], newLastResponseId };
      }
      throw e;
    }
  } catch (err) {
    throw err;
  }

  return { stream, newTurnInput, newLastResponseId };
}

async function processEventsWithoutStreaming(output, handleFunctionCall, emitItem) {
  const turnInput = [];
  
  for (const item of output) {
    if (item.type === "function_call") {
      const result = await handleFunctionCall(item);
      turnInput.push(...result);
    }
    emitItem(item);
  }
  
  return turnInput;
}