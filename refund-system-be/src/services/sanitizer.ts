/**
 * Input sanitizer for customer-submitted refund messages.
 *
 * Goals:
 * 1. Strip characters that could be used for markdown/code injection
 * 2. Truncate to a safe length
 * 3. Detect and flag known prompt injection patterns
 * 4. Return a clean string safe to include in an AI prompt
 */

// Known prompt injection indicators
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior|above|system)\s+(instructions?|prompt|rules?|policy)/i,
  /override\s+(the\s+)?(policy|rules?|instructions?|system)/i,
  /as\s+an\s+ai/i,
  /you\s+are\s+now/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if\s+you\s+are|a\s+different)/i,
  /disregard\s+(the\s+)?(policy|rules?|instructions?)/i,
  /new\s+instructions?:/i,
  /system\s+prompt/i,
  /\[INST\]/i,
  /<<SYS>>/i,
];

const MAX_MESSAGE_LENGTH = 1000;

export interface SanitizeResult {
  sanitized: string;
  injectionDetected: boolean;
  injectionFlags: string[];
}

export function sanitizeMessage(raw: string): SanitizeResult {
  const injectionFlags: string[] = [];

  // Check for injection patterns before stripping
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(raw)) {
      injectionFlags.push(pattern.source);
    }
  }

  // Strip potentially dangerous characters and control sequences
  let sanitized = raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/[<>]/g, '')                                 // HTML brackets
    .replace(/`{3,}/g, '')                               // triple backtick code fences
    .replace(/#{1,6}\s/g, '')                            // markdown headers
    .replace(/\*{2,}/g, '')                              // bold/italic markers
    .trim();

  // Truncate to safe length
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
  }

  return {
    sanitized,
    injectionDetected: injectionFlags.length > 0,
    injectionFlags,
  };
}
