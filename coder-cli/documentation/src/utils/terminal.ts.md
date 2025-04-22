# src/utils/terminal.ts

## Summary
Track whether the clean‑up routine has already executed so repeat calls are silently ignored. This can happen when different exit paths (e.g. the raw Ctrl‑C handler and the process "exit" event) both attempt to tidy up.

## Functionalities
- setInkRenderer
- clearTerminal
- onExit