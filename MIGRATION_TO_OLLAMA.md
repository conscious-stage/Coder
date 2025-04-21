# Migration to Ollama API in Codex-CLI

This document summarizes the steps taken to integrate the local Ollama API into the OpenAI-based
Codex-CLI, replacing remote OpenAI calls with a local Ollama server. It lists the files modified,
the rationale for each change, and the specific code adjustments.

## 1. `src/utils/config.ts`
- **What changed**
  - Set a default `OPENAI_BASE_URL` to `http://localhost:3000/v1` (the Ollama OpenAI-compatible endpoint).
- **Why**
  - To route all OpenAI SDK HTTP calls to the local Ollama server unless overridden by env var.
- **Code snippet**
  ```ts
  export const OPENAI_BASE_URL =
    process.env['OPENAI_BASE_URL'] || 'http://localhost:3000/v1';
  ```

## 2. `src/utils/model-utils.ts`
- **What changed**
  - Updated `fetchModels()` to instantiate the OpenAI client with the new `OPENAI_BASE_URL`.
  - Removed the API-key guard so model listing always queries the Ollama `/v1/models` endpoint.
- **Why**
  - To fetch the list of installed local models directly from Ollama, matching OpenAI-style model listing.
- **Code snippet**
  ```ts
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });
  const list = await openai.models.list();
  ```

## 3. `src/utils/agent/agent-loop.ts`
- **What changed**
  - Imported `OPENAI_BASE_URL` and the agent `prefix`.
  - Added a branch in `AgentLoop.run()` to detect when `OPENAI_BASE_URL` points to `localhost`.
    - **Local path**: Stage the user’s input items in the TUI, then call `chat.completions.create` with `stream: false`.
    - Stage a single assistant message from `resp.choices[0].message.content`.
    - Skip the unified `/responses` streaming logic.
- **Why**
  - Ollama’s API emits standard OpenAI chat completions, so we use that path locally and avoid the unsupported unified endpoint.
- **Code snippet**
  ```ts
  if (OPENAI_BASE_URL.startsWith('http://localhost')) {
    // echo user messages
    for (const item of turnInput) stageItem(item);
    // build chat payload
    const messages = [
      { role: 'system', content: prefix + '\n' + instructions },
      ...userMessages
    ];
    const resp = await this.oai.chat.completions.create({
      model: this.model,
      stream: false,
      messages,
    });
    const content = resp.choices?.[0]?.message.content;
    if (content) stageItem({ id: ..., type: 'message', role: 'assistant', content: [{type:'output_text',text:content}] });
    this.onLoading(false);
    return;
  }
  ```

## Switching Between Ollama and OpenAI
To force the CLI to use the real OpenAI API, set the environment var:
```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY='sk-...'
```
To revert to Ollama, unset or reset `OPENAI_BASE_URL`:
```bash
unset OPENAI_BASE_URL
# or
export OPENAI_BASE_URL=http://localhost:3000/v1
```

## Purpose of This File
This summary enables future LLM-driven refactors to understand where and how to swap
the OpenAI backend, by following the changes in these core utility files.