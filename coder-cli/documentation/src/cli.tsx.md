# src/cli.tsx

## Summary
Main CLI entry point: loads environment, parses command-line flags with `meow`,
loads configuration, and starts either the interactive Ink-based UI or the
single-pass editing mode based on the user’s options.

## Related files
- [src/app.tsx](app.tsx.md)
- [src/approvals.ts](approvals.ts.md)
- [src/utils/agent/agent-loop.ts](utils/agent/agent-loop.ts.md)
- [src/utils/config.ts](utils/config.ts.md)
- [src/cli-singlepass.tsx](cli-singlepass.tsx.md)
- [src/utils/agent/log.ts](utils/agent/log.ts.md)
- [src/utils/agent/review.ts](utils/agent/review.ts.md)
- [src/utils/auto-approval-mode.ts](utils/auto-approval-mode.ts.md)
- [src/utils/check-updates.ts](utils/check-updates.ts.md)
- [src/utils/input-utils.ts](utils/input-utils.ts.md)
- [src/utils/parsers.ts](utils/parsers.ts.md)
- [src/utils/terminal.ts](utils/terminal.ts.md)