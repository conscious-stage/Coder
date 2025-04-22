import OpenAI from 'openai';
import {
  OPENAI_BASE_URL,
  OPENAI_TIMEOUT_MS,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_API_KEY,
} from '../config.js';
import { ORIGIN, CLI_VERSION } from '../session.js';

export function createOpenAIClient(config, sessionId) {
  const timeoutMs = OPENAI_TIMEOUT_MS;
  // Determine which provider to use based on baseURL
  let baseURL = OPENAI_BASE_URL;
  // Default to OpenAI API key unless using DeepSeek
  let apiKey = config.apiKey ?? process.env["OPENAI_API_KEY"] ?? "";
  // If targeting DeepSeek, override baseURL and apiKey
  if (OPENAI_BASE_URL.includes('api.deepseek.com') && DEEPSEEK_API_KEY) {
    baseURL = DEEPSEEK_BASE_URL;
    apiKey = DEEPSEEK_API_KEY;
  }
  return new OpenAI({
    ...(apiKey ? { apiKey } : {}),
    baseURL: baseURL,
    defaultHeaders: {
      originator: ORIGIN,
      version: CLI_VERSION,
      session_id: sessionId
    },
    ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {})
  });
}