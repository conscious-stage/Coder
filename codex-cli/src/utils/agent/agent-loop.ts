import { createOpenAIClient } from './api-client.js';
import { handleFunctionCall } from './function-call-handler.js';
import { prefix } from './prefix.js';
import { processStream } from './stream-handler.js';
import { handleAPIError, MAX_RETRIES, RATE_LIMIT_RETRY_WAIT_MS } from './error-handling.js';
import { log, isLoggingEnabled } from './log.js';
import { getSessionId, setSessionId, setCurrentModel } from '../session.js';
import { OPENAI_BASE_URL } from '../config.js';
import { randomUUID } from 'node:crypto';

const alreadyProcessedResponses = new Set();

export class AgentLoop {
  constructor({
    model,
    instructions,
    approvalPolicy,
    config,
    onItem,
    onLoading,
    getCommandConfirmation,
    onLastResponseId,
    additionalWritableRoots
  }) {
    this.currentStream = null;
    this.generation = 0;
    this.execAbortController = null;
    this.canceled = false;
    this.pendingAborts = new Set();
    this.terminated = false;
    this.hardAbort = new AbortController();
    
    this.model = model;
    this.instructions = instructions;
    this.approvalPolicy = approvalPolicy;
    this.config = config ?? { model, instructions: instructions ?? "" };
    this.additionalWritableRoots = additionalWritableRoots;
    this.onItem = onItem;
    this.onLoading = onLoading;
    this.getCommandConfirmation = getCommandConfirmation;
    this.onLastResponseId = onLastResponseId;
    
    this.sessionId = getSessionId() || randomUUID().replaceAll("-", "");
    this.oai = createOpenAIClient(this.config, this.sessionId);
    
    setSessionId(this.sessionId);
    setCurrentModel(this.model);
    
    this.hardAbort = new AbortController();
    this.hardAbort.signal.addEventListener(
      "abort",
      () => this.execAbortController?.abort(),
      { once: true }
    );
  }

  cancel() {
    if (this.terminated) return;
    
    this.currentStream = null;
    if (isLoggingEnabled()) 
      log(`AgentLoop.cancel() invoked – currentStream=${Boolean(this.currentStream)} execAbortController=${Boolean(this.execAbortController)} generation=${this.generation}`);
    
    this.currentStream?.controller?.abort?.();
    this.canceled = true;
    this.execAbortController?.abort();
    this.execAbortController = new AbortController();
    
    if (isLoggingEnabled()) log("AgentLoop.cancel(): execAbortController.abort() called");
    
    if (this.pendingAborts.size === 0) {
      try { this.onLastResponseId(""); } catch (_e) {}
    }
    
    this.onLoading(false);
    this.generation += 1;
    
    if (isLoggingEnabled()) log(`AgentLoop.cancel(): generation bumped to ${this.generation}`);
  }

  terminate() {
    if (this.terminated) return;
    this.terminated = true;
    this.hardAbort.abort();
    this.cancel();
  }

  async run(input, previousResponseId = "") {
    if (this.terminated) throw new Error("AgentLoop has been terminated");
    
    const thinkingStart = Date.now();
    const thisGeneration = ++this.generation;
    this.canceled = false;
    this.currentStream = null;
    this.execAbortController = new AbortController();
    
    if (isLoggingEnabled())
      log(`AgentLoop.run(): new execAbortController created (${this.execAbortController.signal}) for generation ${this.generation}`);
    
    let lastResponseId = previousResponseId;
    const abortOutputs = [];
    
    if (this.pendingAborts.size > 0) {
      for (const id of this.pendingAborts)
        abortOutputs.push({
          type: "function_call_output",
          call_id: id,
          output: JSON.stringify({ output: "aborted", metadata: { exit_code: 1, duration_seconds: 0 } }),
        });
      this.pendingAborts.clear();
    }
    
    let turnInput = [...abortOutputs, ...input];
    this.onLoading(true);
    
    const staged = [];
    const stageItem = (item) => {
      if (thisGeneration !== this.generation) return;
      const idx = staged.push(item) - 1;
      setTimeout(() => {
        if (thisGeneration === this.generation && !this.canceled && !this.hardAbort.signal.aborted) {
          this.onItem(item);
          staged[idx] = undefined;
        }
      }, 10);
    };
    
    try {
      // If we're pointing at a local Ollama OpenAI-compatible API, use chat.completions
      if (OPENAI_BASE_URL.startsWith('http://localhost')) {
        // Build chat messages for Ollama: include agent prefix + user instructions
        const messages = [];
        const systemContent = [prefix, this.instructions]
          .filter(Boolean)
          .join('\n');
        if (systemContent) {
          messages.push({ role: 'system', content: systemContent });
        }
        for (const item of turnInput) {
          // Unified user messages or input_text map to chat user content
          if ((item.type === 'message' && item.role === 'user') || item.type === 'input_text') {
            const text =
              item.type === 'input_text'
                ? item.text
                : item.content?.[0]?.text;
            if (text) messages.push({ role: 'user', content: text });
          }
        }
        // Stream via chat.completions
        const stream = await this.oai.chat.completions.create({
          model: this.model,
          stream: true,
          messages,
        });
        // Stream each assistant delta as a message with unique id
        let deltaCount = 0;
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            const msg = {
              id: `ollama-${Date.now()}-${deltaCount++}`,
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: delta }]
            };
            stageItem(msg);
          }
        }
        this.onLoading(false);
        return;
      }
      // Main loop processing input and responses (unified OpenAI API)
      await this.processInputAndResponses(turnInput, thinkingStart, thisGeneration, stageItem, lastResponseId, staged);
    } catch (err) {
      await handleAPIError(err, this.onItem, this.onLoading);
    }
  }

  async processInputAndResponses(turnInput, thinkingStart, thisGeneration, stageItem, lastResponseId, staged) {
    while (turnInput.length > 0) {
      if (this.canceled || this.hardAbort.signal.aborted) {
        this.onLoading(false);
        return;
      }
      
      for (const item of turnInput) stageItem(item);
      
      const { stream, newTurnInput, newLastResponseId } = await processStream(
        this.oai,
        this.model,
        this.instructions,
        turnInput,
        lastResponseId,
        this.config,
        stageItem,
        thisGeneration,
        this.generation,
        this.canceled,
        this.currentStream,
        this.pendingAborts,
        thinkingStart,
        this.handleFunctionCall.bind(this),
        this.onLastResponseId,
        this.hardAbort
      );
      
      this.currentStream = stream;
      turnInput = newTurnInput;
      lastResponseId = newLastResponseId;
      
      if (!stream || this.canceled || this.hardAbort.signal.aborted) {
        this.onLoading(false);
        return;
      }
    }
    
    const flush = () => {
      if (!this.canceled && !this.hardAbort.signal.aborted && thisGeneration === this.generation) {
        for (const item of staged) if (item) this.onItem(item);
      }
      this.pendingAborts.clear();
      this.onLoading(false);
    };
    
    setTimeout(flush, 30);
  }

  async handleFunctionCall(item) {
    return await handleFunctionCall(
      item, 
      this.canceled, 
      this.config, 
      this.approvalPolicy, 
      this.additionalWritableRoots, 
      this.getCommandConfirmation, 
      this.execAbortController?.signal
    );
  }

  async processEventsWithoutStreaming(output, emitItem) {
    if (this.canceled) return [];
    
    const turnInput = [];
    for (const item of output) {
      if (item.type === "function_call") {
        if (alreadyProcessedResponses.has(item.id)) continue;
        alreadyProcessedResponses.add(item.id);
        
        const result = await this.handleFunctionCall(item);
        turnInput.push(...result);
      }
      emitItem(item);
    }
    
    return turnInput;
  }
}