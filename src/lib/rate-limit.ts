/**
 * Simple in-memory rate limiter for API endpoints.
 * In production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  options: { maxRequests: number; windowMs: number } = { maxRequests: 10, windowMs: 60_000 },
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    store.set(identifier, newEntry);
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      reset: newEntry.resetTime,
    };
  }

  if (entry.count >= options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  entry.count++;
  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - entry.count,
    reset: entry.resetTime,
  };
}
