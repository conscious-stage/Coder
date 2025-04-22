import { createOpenAIClient } from './api-client.js';
import { handleFunctionCall } from './function-call-handler.js';
import { prefix, LLMPrefix } from './prefix.js';
import { processStream } from './stream-handler.js';
import { handleAPIError, MAX_RETRIES, RATE_LIMIT_RETRY_WAIT_MS } from './error-handling.js';
import { log, isLoggingEnabled } from './log.js';
import { getSessionId, setSessionId, setCurrentModel } from '../session.js';
import { OPENAI_BASE_URL } from '../config.js';
import { randomUUID } from 'node:crypto';

const alreadyProcessedResponses = new Set();

export class AgentLoop {
  // Flag and storage for local Ollama/Deepseek conversation history
  // Flag indicating if using a local Ollama/Deepseek provider
  private isLocalProvider = false;
  // In-memory message history for local providers
  private localMessages: Array<{ role: string; content: string; }> = [];
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
    // Initialize local provider message history for Ollama/Deepseek
    this.isLocalProvider = OPENAI_BASE_URL.startsWith('http://localhost') || OPENAI_BASE_URL.includes('api.deepseek.com');
    if (this.isLocalProvider) {
      this.localMessages = [];
    }
    
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
      const isOllamaLocal = OPENAI_BASE_URL.startsWith('http://localhost');
      const isDeepseek = OPENAI_BASE_URL.includes('api.deepseek.com');
      if (isOllamaLocal || isDeepseek) {
        // JSON-driven command loop for local Ollama/Deepseek
        // Build messages from persisted history and new user messages
        if (this.localMessages.length === 0) {
          const systemContent = [LLMPrefix, this.instructions].filter(Boolean).join('\n');
          this.localMessages.push({ role: 'system', content: systemContent });
        }
        // Append new user messages to history
        for (const item of turnInput) {
          stageItem(item);
          if ((item.type === 'message' && item.role === 'user') || item.type === 'input_text') {
            const text = item.type === 'input_text' ? item.text : item.content?.[0]?.text;
            if (text) {
              this.localMessages.push({ role: 'user', content: text });
            }
          }
        }
        const messages = [...this.localMessages];
        // Loop: ask model, parse JSON, execute commands, feed back output
        while (true) {
          let resp;
          try {
            resp = await this.oai.chat.completions.create({
              model: this.model,
              stream: false,
              messages,
            });
          } catch (err) {
            await handleAPIError(err, this.onItem, this.onLoading);
            return;
          }
          const content = resp.choices?.[0]?.message?.content;
          if (!content) break;
          let obj;
          try {
            obj = JSON.parse(content);
          } catch {
            // not JSON: display raw and abort
            stageItem({ id: `local-raw-${Date.now()}`, type: 'message', role: 'assistant', content: [{ type: 'output_text', text: content }] });
            break;
          }
          // Display assistant message
          if (obj.message) {
            stageItem({ id: `local-msg-${Date.now()}`, type: 'message', role: 'assistant', content: [{ type: 'output_text', text: obj.message }] });
            // Persist assistant message to history
            this.localMessages.push({ role: 'assistant', content: obj.message });
          }
          // If command present, execute
          if (Array.isArray(obj.command) && obj.command.length > 0) {
            const fakeCall = { name: 'shell', arguments: JSON.stringify({ command: obj.command, workdir: obj.workdir ?? undefined, timeout: obj.timeout ?? undefined }), call_id: `local-cmd-${Date.now()}` };
            const results = await this.handleFunctionCall(fakeCall);
            for (const item of results) stageItem(item);
            // feed output back to model
            const outputItem = results.find(i => i.type === 'function_call_output');
            if (outputItem && typeof outputItem.output === 'string') {
              messages.push({ role: 'user', content: outputItem.output });
              // Persist command output to history
              this.localMessages.push({ role: 'user', content: outputItem.output });
            }
          }
          // Stop if complete
          if (obj.complete) break;
        }
        this.onLoading(false);
        // DEBUG: dump in-memory local history to console in development
        /* istanbul ignore next */
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [AgentLoop] localMessages:', this.localMessages);
        }
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