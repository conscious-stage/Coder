import { log } from './log.js';
import OpenAI, { APIConnectionTimeoutError } from 'openai';

export const MAX_RETRIES = 5;
export const RATE_LIMIT_RETRY_WAIT_MS = parseInt(process.env["OPENAI_RATE_LIMIT_RETRY_WAIT_MS"] || "2500", 10);

export async function handleAPIError(error, attempt, maxRetries) {
  const isTimeout = error instanceof APIConnectionTimeoutError;
  const ApiConnErrCtor = OpenAI.APIConnectionError;
  const isConnectionError = ApiConnErrCtor ? error instanceof ApiConnErrCtor : false;
  
  const errCtx = error;
  const status = errCtx?.status ?? errCtx?.httpStatus ?? errCtx?.statusCode;
  const isServerError = typeof status === "number" && status >= 500;
  
  if ((isTimeout || isServerError || isConnectionError) && attempt < maxRetries) {
    log(`OpenAI request failed (attempt ${attempt}/${maxRetries}), retrying...`);
    return 'retry';
  }
  
  const isTooManyTokensError = (
    errCtx.param === "max_tokens" || 
    (typeof errCtx.message === "string" && /max_tokens is too large/i.test(errCtx.message))
  ) && errCtx.type === "invalid_request_error";
  
  if (isTooManyTokensError) {
    return 'abort';
  }
  
  const isRateLimit = 
    status === 429 || 
    errCtx.code === "rate_limit_exceeded" || 
    errCtx.type === "rate_limit_exceeded" || 
    /rate limit/i.test(errCtx.message ?? "");
  
  if (isRateLimit) {
    if (attempt < maxRetries) {
      let delayMs = RATE_LIMIT_RETRY_WAIT_MS * 2 ** (attempt - 1);
      const msg = errCtx?.message ?? "";
      const m = /(?:retry|try) again in ([\d.]+)s/i.exec(msg);
      
      if (m && m[1]) {
        const suggested = parseFloat(m[1]) * 1000;
        if (!Number.isNaN(suggested)) delayMs = suggested;
      }
      
      log(`OpenAI rate limit exceeded (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delayMs)} ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return 'retry';
    } else {
      return 'abort';
    }
  }
  
  return 'continue';
}

export async function handleResponseError(err, onItem, onLoading) {
  const isPrematureClose = err instanceof Error && (
    err.code === "ERR_STREAM_PREMATURE_CLOSE" || 
    err.message?.includes("Premature close")
  );
  
  if (isPrematureClose) {
    try {
      onItem({
        id: `error-${Date.now()}`,
        type: "message",
        role: "system",
        content: [{
          type: "input_text",
          text: "⚠️  Connection closed prematurely while waiting for the model. Please try again."
        }]
      });
    } catch (_) {}
    
    onLoading(false);
    return;
  }
  
  const NETWORK_ERRNOS = new Set([
    "ECONNRESET", "ECONNREFUSED", "EPIPE", "ENOTFOUND", 
    "ETIMEDOUT", "EAI_AGAIN"
  ]);
  
  const isNetworkOrServerError = (() => {
    if (!err || typeof err !== "object") return false;
    
    const e = err;
    const ApiConnErrCtor = OpenAI.APIConnectionError;
    
    if (ApiConnErrCtor && e instanceof ApiConnErrCtor) return true;
    if (typeof e.code === "string" && NETWORK_ERRNOS.has(e.code)) return true;
    if (e.cause && typeof e.cause === "object" && NETWORK_ERRNOS.has(e.cause.code ?? "")) return true;
    if (typeof e.status === "number" && e.status >= 500) return true;
    if (typeof e.message === "string" && /network|socket|stream/i.test(e.message)) return true;
    
    return false;
  })();
  
  if (isNetworkOrServerError) {
    try {
      const msgText = "⚠️  Network error while contacting OpenAI. Please check your connection and try again.";
      onItem({
        id: `error-${Date.now()}`,
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: msgText }]
      });
    } catch (_) {}
    
    onLoading(false);
    return;
  }
  
  throw err;
}