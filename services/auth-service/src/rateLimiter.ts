import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: {},
});

interface RateLimitOptions {
  windowMs: number;   // window size in ms (e.g. 60_000 for 1 min)
  max: number;        // max requests per window
  keyPrefix?: string;
}

export function slidingWindowRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = options;

  return async (req: any, res: any, next: any) => {
    // Key by userId (set by verifyGateway) or fall back to IP
    const identifier = req.headers['x-user-id'] || req.ip;
    const now = Date.now();
    const windowSec = Math.floor(windowMs / 1000);
    console.log("Time Now: ", now);

    // Two keys: one for the current window bucket, one for previous
    const currentWindow = Math.floor(now / windowMs);
    const prevWindow = currentWindow - 1;

    const currKey = `${keyPrefix}:${identifier}:${currentWindow}`;
    const prevKey = `${keyPrefix}:${identifier}:${prevWindow}`;
    console.log("currKey: ", currKey);
    console.log("prevKey: ", prevKey);

    // Atomic pipeline: increment current window, fetch previous
    const pipeline = redis.pipeline();
    pipeline.incr(currKey);
    pipeline.expire(currKey, windowSec * 2); // TTL = 2 windows
    pipeline.get(prevKey);
    const results = await pipeline.exec();
    console.log("Result: ", results);

    const currCount = (results?.[0]?.[1] as number) ?? 0;
    const prevCount = parseInt((results?.[2]?.[1] as string) ?? '0', 10);

    // How far into the current window are we? (0.0 → 1.0)
    const progress = (now % windowMs) / windowMs;

    // Weighted blend: previous window's tail + current window's head
    const effectiveCount = prevCount * (1 - progress) + currCount;

    const remaining = Math.max(0, Math.floor(max - effectiveCount));
    const resetTime = (currentWindow + 1) * windowMs;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000));

    if (effectiveCount > max) {
      // Roll back the increment — request is rejected
      await redis.decr(currKey);
      return res.status(429).json({
        message: 'Too many requests',
        retryAfter: Math.ceil((resetTime - now) / 1000),
      });
    }

    next();
  };
}
