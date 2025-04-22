# src/approvals.ts

## Summary
Implements the approval logic for shell commands and patch applications. Determines
whether a command can be auto-approved under the `suggest`, `auto-edit`, or
`full-auto` policies, and handles sandboxing for unsafe operations.

## Functionalities
- canAutoApprove
- isSafeCommand

## Related files
- [src/utils/config.ts](utils/config.ts.md)