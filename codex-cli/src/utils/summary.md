# File Summaries

    1. **approximate-tokens-used.ts**
       - **Description**: Estimates the number of tokens used in a list of OpenAI response items.
       - **Key Function**: \`approximateTokensUsed(items: Array<ResponseItem>): number\`
         - Counts characters across various item types and converts the count to an estimate of tokens.

    2. **auto-approval-mode.js**
       - **Description**: A shim for supporting TypeScript source files when using \`ts-node\`.
       - **Key Function**: Exports enums from a TypeScript file for seamless integration.

    3. **auto-approval-mode.ts**
       - **Description**: Contains enums that define approval modes for auto-approval functionality.
       - **Key Enums**:
         - \`AutoApprovalMode\`: Includes modes like \`SUGGEST\`, \`AUTO_EDIT\`, and \`FULL_AUTO\`.
         - \`FullAutoErrorMode\`: Describes error handling modes.

    4. **bug-report.ts**
       - **Description**: Builds a URL for creating GitHub issues, pre-filling a bug report template using session data.
       - **Key Function**: \`buildBugReportUrl(params: { items, cliVersion, model, platform }): string\`

    5. **check-in-git.ts**
       - **Description**: Checks if a directory is inside a Git repository.
       - **Key Function**: \`checkInGit(workdir: string): boolean\`
         - Uses the \`git rev-parse\` command to determine the Git status.

    6. **check-updates.ts**
       - **Description**: Checks for outdated npm packages and handles update notifications.
       - **Key Functions**:
         - \`checkForUpdates(): Promise<void>\`
         - \`checkOutdated(npmCommandPath: string): Promise<UpdateCheckInfo | undefined>\`

    7. **compact-summary.ts**
       - **Description**: Generates a summary of conversation items using the OpenAI API.
       - **Key Function**: \`generateCompactSummary(items: Array<ResponseItem>, model: string, flexMode?: boolean):
    Promise<string>\`

    8. **config.ts**
       - **Description**: Defines various configuration settings and persistent storage for the application.
       - **Key Values/Functions**:
         - Constants for paths, default settings, and helper functions to load/save configurations (\`loadConfig\`,
    \`saveConfig\`).

    9. **extract-applied-patches.ts**
       - **Description**: Extracts patch texts from message history related to the \`apply_patch\` tool calls.
       - **Key Function**: \`extractAppliedPatches(items: Array<ResponseItem>): string\`

    10. **get-diff.ts**
       - **Description**: Retrieves the Git diff for the working directory.
       - **Key Function**: \`getGitDiff(): { isGitRepo: boolean, diff: string }\`

    11. **input-utils.ts**
       - **Description**: Utility functions to create input items from text and images.
       - **Key Function**: \`createInputItem(text: string, images: Array<string>): Promise<ResponseInputItem.Message>\`

    12. **model-utils.ts**
       - **Description**: Manages model fetching and caching from the OpenAI service.
       - **Key Functions**:
         - \`preloadModels(): void\`
         - \`getAvailableModels(): Promise<Array<string>>\`
         - \`isModelSupportedForResponses(model: string | undefined | null): Promise<boolean>\`

    13. **parsers.ts**
       - **Description**: Contains utility functions for parsing tool call outputs and arguments.
       - **Key Functions**:
         - \`parseToolCallOutput(toolCallOutput: string): { output: string, metadata: ExecOutputMetadata }\`
         - \`parseToolCall(toolCall: ResponseFunctionToolCall): CommandReviewDetails | undefined\`

    14. **session.ts**
       - **Description**: Tracks and manages session data for the CLI.
       - **Key Functions**:
         - \`setSessionId(id: string): void\`
         - \`getSessionId(): string\`
         - \`setCurrentModel(model: string): void\`
         - \`getCurrentModel(): string\`

    15. **short-path.ts**
       - **Description**: Utility functions to shorten file paths for display.
       - **Key Function**: \`shortenPath(p: string, maxLength: number): string\`

    16. **slash-commands.ts**
       - **Description**: Defines available slash commands for user input in the CLI.
       - **Key Constant**: \`SLASH_COMMANDS\`: An array of command objects, each containing a \`command\` string and a