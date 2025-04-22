### File Summary for code_diff.ts

        * **Purpose**: This file handles the generation and manipulation of file diffs to show changes between original and
    modified file contents.

    #### Functions:

        1. **`generateFileDiff(originalContent: string, updatedContent: string, filePath: string): string`**


            * Generates a unified diff of two file contents.
        2. **`generateColoredDiff(diffContent: string): string`**


            * Applies ANSI color codes to a unified diff for better readability.
        3. **`generateDiffStats(diffContent: string): [number, number]`**


            * Counts and returns the number of lines added and removed in the diff.
        4. **`generateDiffSummary(editedFiles: EditedFiles, originalFileContents: Record<string, string>): [string,
    Array<FileOperation>]`**


            * Summarizes diffs for each file operation that has differences, generating a combined diff string.
        5. **`generateEditSummary(opsToApply: Array<FileOperation>, originalFileContents: Record<string, string>): string`**


            * Generates a user-friendly summary of the pending file operations, indicating whether files will be created,
    modified, or deleted.


### File Summary for context_files.ts

        * **Purpose**: This file provides functionality for handling file contents, implementing an LRU (Least Recently Used)
    cache for efficient file access, and managing file ignore patterns.

    #### Functions:

        1. **`loadIgnorePatterns(filePath?: string): Array<RegExp>`**


            * Loads ignore patterns from a specified file or uses default patterns if no file is provided. Returns an array of
     RegExp patterns to determine which files to ignore.
        2. **`shouldIgnorePath(p: string, compiledPatterns: Array<RegExp>): boolean`**


            * Checks if a given file path is ignored by any of the compiled ignore patterns.
        3. **`makeAsciiDirectoryStructure(rootPath: string, filePaths: Array<string>): string`**


            * Recursively constructs an ASCII representation of a directory structure based on a list of file paths.
        4. **`getFileContents(rootPath: string, compiledPatterns: Array<RegExp>): Promise<Array<FileContent>>`**


            * Collects and returns an array of `FileContent` objects for all files under a specified root path that are not
    ignored. It makes use of the LRU cache to avoid unnecessary file reads.


### File Summary for context_limit.ts

        * **Purpose**: This file computes and prints information about file sizes within a directory structure, allowing for
    monitoring and debugging of size limits.

    #### Functions:

        1. **`computeSizeMap(root: string, files: Array<FileContent>): [Record<string, number>, Record<string, number>]`**


            * Builds a mapping of individual file sizes and cumulative sizes for all files and directories under a specified
    root path.
        2. **`buildChildrenMap(root: string, totalSizeMap: Record<string, number>): Record<string, Array<string>>`**


            * Constructs a mapping from directory paths to their immediate child paths, facilitating a hierarchical view of
    the directory structure.
        3. **`printSizeTree(current: string, childrenMap: Record<string, Array<string>>, fileSizeMap: Record<string, number>,
    totalSizeMap: Record<string, number>, prefix: string, isLast: boolean, contextLimit: number): void`**


            * Recursively prints the directory/file tree while showing size usage and cumulative sizes.
        4. **`printDirectorySizeBreakdown(directory: string, files: Array<FileContent>, contextLimit = 300_000): void`**


            * Prints a comprehensive breakdown of directory sizes and cumulative percentages, useful for monitoring total size
     usage against a specified limit.


### File Summary for context.ts

        * **Purpose**: This file defines the task context structure for operations that involve editing files, along with
    rendering this context for output.

    #### Functions:

        1. **`renderTaskContext(taskContext: TaskContext): string`**


            * Renders a formatted string representation of the `TaskContext`, including a prompt for the task and important
    output requirements, as well as a summary of the directory structure and file contents in a custom XML-like format.
        2. **`renderFilesToXml(files: Array<FileContent>): string`**


            * Converts a list of `FileContent` objects into an XML-like format, embedding file contents within CDATA sections
    for proper formatting.

### File Summary for file_ops.ts

        * **Purpose**: This file uses the `zod` library to define schemas for file operations, such as modifications,
    deletions, and moves.

    #### Functions:

        1. **`FileOperationSchema`**


            * Defines the structure of a file operation, which includes:

                * `path`: Absolute path to the file.


                * `updated_full_content`: Full content of the file after modification.


                * `delete`: Boolean indicating if the file should be deleted.


                * `move_to`: New path if the file is to be moved.

            * Contains mutual exclusivity rules to ensure only one of the `updated_full_content`, `delete`, or `move_to`
    fields is set.
        2. **`EditedFilesSchema`**


            * Defines a container for one or more file operations, holding an array of `FileOperation` objects.


