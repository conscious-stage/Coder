<!--
  FILE_SUMMARY.md
  A brief overview of each source file in the directory.
-->
# File Summary

This document provides a concise description of each file and lists the key exports.

## Root Files

### agent-loop.ts
- Purpose: Implements the main agent loop for sending inputs to OpenAI, streaming responses,
  handling function calls, retries, and abort/termination logic.
- Key export:
  - `AgentLoop` class:
    - constructor(options)
    - cancel()
    - terminate()
    - run(input, previousResponseId)
    - processInputAndResponses(...)
    - handleFunctionCall(item)
    - processEventsWithoutStreaming(output, emitItem)

### api-client.ts
- Purpose: Creates and configures the OpenAI API client with headers, timeout, and base URL.
- Key export:
  - `createOpenAIClient(config, sessionId)`

### apply-patch.ts
- Purpose: Parses GPT-generated patch text into structured diffs and applies them to the filesystem.
- Key exports:
  - `assemble_changes(orig, updatedFiles)`
  - `text_to_patch(text)`
  - `identify_files_needed(text)`
  - `identify_files_added(text)`
  - `patch_to_commit(patch)`
  - `load_files(loader)`
  - `apply_commit(commit, readers, writers, removers)`
  - `process_patch(patchText, read, write, delete)`
  - `Parser` class and `DiffError`

### error-handling.ts
- Purpose: Implements retry logic and user-facing error handling for OpenAI API and network errors.
- Key exports:
  - `MAX_RETRIES`, `RATE_LIMIT_RETRY_WAIT_MS`
  - `handleAPIError(error, attempt, maxRetries)`
  - `handleResponseError(error, onItem, onLoading)`

### exec.ts
- Purpose: Provides sandboxed/raw execution of shell commands and patch application.
- Key exports:
  - `exec(input, sandboxType, abortSignal)`
  - `execApplyPatch(patchText)`
  - `getBaseCmd(cmd)`

### function-call-handler.ts
- Purpose: Routes `function_call` items from the model to appropriate tool handlers.
- Key export:
  - `handleFunctionCall(item, canceled, config, approvalPolicy, additionalWritableRoots, getCommandConfirmation, abortSignal)`

### handle-exec-command.ts
- Purpose: Manages command approval workflow, sandbox policy, and delegates to execution or patch functions.
- Key export:
  - `handleExecCommand(args, config, policy, additionalWritableRoots, getCommandConfirmation, abortSignal)`
  - Internal helpers: `deriveCommandKey()`, `execCommand()`, `askUserPermission()`

### log.ts
- Purpose: Initializes and writes structured logs to a file when DEBUG is enabled; otherwise no-ops.
- Key exports:
  - `initLogger()`
  - `log(message)`
  - `isLoggingEnabled()`

### parse-apply-patch.ts
- Purpose: Parses a textual patch (marked with `*** Begin Patch`/`*** End Patch`) into operations for file creation, deletion, or updates.
- Key export:
  - `parseApplyPatch(patch: string): ApplyPatchOp[] | null`

### platform-commands.ts
- Purpose: Adapts Unix shell commands and options for Windows platforms.
- Key export:
  - `adaptCommandForPlatform(command: string[])`

### prefix.ts
- Purpose: Defines the system prompt prefix used for guiding the Codex CLI behavior.
- Key export:
  - `prefix` (string)

### review.ts
- Purpose: Enumerates possible user review decisions for command approval.
- Key export:
  - `ReviewDecision` enum

### stream-handler.ts
- Purpose: Handles streaming responses from OpenAI, stages output items, manages retries, and invokes function calls.
- Key export:
  - `processStream(oai, model, instructions, turnInput, lastResponseId, config, stageItem, thisGeneration, generation, canceled, currentStream, pendingAborts, thinkingStart, handleFunctionCall, onLastResponseId, hardAbort)`

### utils.ts
- Purpose: Provides a helper (`__asyncValues`) for async iteration compatibility.
- Key export:
  - `__asyncValues`

## Sandbox Directory

### sandbox/interface.ts
- Purpose: Defines types and enums for sandbox execution environments.
- Key exports:
  - `SandboxType` enum
  - `ExecInput`, `ExecResult`, `ExecOutputMetadata` types

### sandbox/macos-seatbelt.ts
- Purpose: Implements macOS sandbox-exec policy for restricting write permissions while allowing read and controlled write.
- Key export:
  - `execWithSeatbelt(cmd, opts, writableRoots, abortSignal)`

### sandbox/raw-exec.ts
- Purpose: Executes system commands via `child_process.spawn`, capturing output, handling platform adaptation and aborts.
- Key export:
  - `exec(command, options, writableRoots, abortSignal)`