# src/parse-apply-patch.ts

## Summary
Parses unified diff patch strings into structured operations (file additions, deletions, updates, and hunks) for the `apply_patch` command.

## Functionalities
- parseApplyPatch
- PATCH_PREFIX
- PATCH_SUFFIX
- ADD_FILE_PREFIX
- DELETE_FILE_PREFIX
- UPDATE_FILE_PREFIX
- MOVE_FILE_TO_PREFIX
- END_OF_FILE_PREFIX
- HUNK_ADD_LINE_PREFIX