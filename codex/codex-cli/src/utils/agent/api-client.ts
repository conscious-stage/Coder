import OpenAI from 'openai';
import { OPENAI_BASE_URL, OPENAI_TIMEOUT_MS } from '../config.js';
import { ORIGIN, CLI_VERSION } from '../session.js';

export function createOpenAIClient(config, sessionId) {
  const timeoutMs = OPENAI_TIMEOUT_MS;
  const apiKey = config.apiKey ?? process.env["OPENAI_API_KEY"] ?? "";
  
  return new OpenAI({
    ...(apiKey ? { apiKey } : {}),
    baseURL: OPENAI_BASE_URL,
    defaultHeaders: {
      originator: ORIGIN,
      version: CLI_VERSION,
      session_id: sessionId
    },
    ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {})
  });
}