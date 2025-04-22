# src/cli-singlepass.tsx

## Summary
Provides the full-context (single-pass) editing mode: renders the `SinglePassApp`
component via Ink to let users review and apply all code edits in one batch.

## Functionalities
- `runSinglePass`: entrypoint that renders `SinglePassApp` and resolves on exit.

## Related files
- [src/utils/config.ts](utils/config.ts.md)
- [src/components/singlepass-cli-app.tsx](components/singlepass-cli-app.tsx.md)