# scripts/generate-docs.js

## Summary
Node.js script that scans every source file in the project, extracts a simple
summary from comments, lists exported symbols, and identifies related files via
imports, then writes a mirrored set of Markdown docs under `documentation/`.

## Functionalities
- Recursively gathers all files in the project (`getAllFiles`)
- Extracts summaries from comments or heuristics
- Lists exported functions, constants, and default exports
- Identifies related files by resolving import paths
- Writes a matching `.md` file per source file under `documentation/`