# src/utils/config.ts

## Summary
NOTE: We intentionally point the TypeScript import at the source file (`./auto-approval-mode.ts`) instead of the emitted `.js` bundle.  This makes the module resolvable when the project is executed via `ts-node`, which resolves *source* paths rather than built artefacts.  During a production build the TypeScript compiler will automatically rewrite the path to `./auto-approval-mode.js`, so the change is completely transparent for the compiled `dist/` output used by the published CLI.

## Functionalities
- setApiKey
- discoverProjectDocPath
- loadProjectDoc
- DEFAULT_AGENTIC_MODEL
- DEFAULT_FULL_CONTEXT_MODEL
- DEFAULT_APPROVAL_MODE
- DEFAULT_INSTRUCTIONS
- CONFIG_DIR
- CONFIG_JSON_FILEPATH
- CONFIG_YAML_FILEPATH
- CONFIG_YML_FILEPATH
- CONFIG_FILEPATH
- INSTRUCTIONS_FILEPATH
- OPENAI_TIMEOUT_MS
- OPENAI_BASE_URL
- PRETTY_PRINT
- PROJECT_DOC_MAX_BYTES
- loadConfig
- saveConfig

## Related files
- [src/utils/auto-approval-mode.js](auto-approval-mode.js.md)