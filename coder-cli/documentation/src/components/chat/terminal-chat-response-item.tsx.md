# src/components/chat/terminal-chat-response-item.tsx

## Summary
Dispatches and renders various response types from the assistant or tools: messages, function calls, tool outputs, and reasoning. Delegates to specialized subcomponents for each type.

## Functionalities
- TerminalChatResponseItem (default export)
- TerminalChatResponseMessage
- TerminalChatResponseToolCall
- TerminalChatResponseToolCallOutput
- TerminalChatResponseReasoning
- TerminalChatResponseGenericMessage

## Related files
- [src/hooks/use-terminal-size.ts](../../hooks/use-terminal-size.ts.md)
- [src/utils/parsers.ts](../../utils/parsers.ts.md)