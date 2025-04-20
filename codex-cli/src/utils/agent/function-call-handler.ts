import { parseToolCallArguments } from '../parsers.js';
import { handleExecCommand } from './handle-exec-command.js';
import { log, isLoggingEnabled } from './log.js';

export async function handleFunctionCall(item, canceled, config, approvalPolicy, additionalWritableRoots, getCommandConfirmation, abortSignal) {
  if (canceled) return [];
  
  const isChatStyle = item.function != null;
  const name = isChatStyle ? item.function?.name : item.name;
  const rawArguments = isChatStyle ? item.function?.arguments : item.arguments;
  const callId = item.call_id ?? item.id;
  
  const args = parseToolCallArguments(rawArguments ?? "{}");
  
  if (isLoggingEnabled()) log(`handleFunctionCall(): name=${name ?? "undefined"} callId=${callId} args=${rawArguments}`);
  
  if (args == null) {
    const outputItem = {
      type: "function_call_output",
      call_id: item.call_id,
      output: `invalid arguments: ${rawArguments}`
    };
    return [outputItem];
  }
  
  const outputItem = {
    type: "function_call_output",
    call_id: callId,
    output: "no function found"
  };
  
  const additionalItems = [];
  
  if (name === "container.exec" || name === "shell") {
    const { outputText, metadata, additionalItems: additionalItemsFromExec } = await handleExecCommand(
      args,
      config,
      approvalPolicy,
      additionalWritableRoots,
      getCommandConfirmation,
      abortSignal
    );
    
    outputItem.output = JSON.stringify({ output: outputText, metadata });
    
    if (additionalItemsFromExec) additionalItems.push(...additionalItemsFromExec);
  }
  
  return [outputItem, ...additionalItems];
}