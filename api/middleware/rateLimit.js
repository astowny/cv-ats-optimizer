const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const Redis = require("ioredis");
const logger = require("../utils/logger");

// Si REDIS_URL est défini, on utilise Redis (scalable horizontalement).
// Sinon, fallback sur le store mémoire (ok pour une instance unique).
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true });
  redisClient.on("error", (err) => {
    logger.error({ err: err.message }, "Redis error — rate limiting fallback to memory");
  });
  logger.info("Rate limiting: Redis store enabled");
} else {
  logger.info("Rate limiting: in-memory store (set REDIS_URL to enable Redis)");
}

function makeStore(prefix) {
  if (!redisClient) return undefined; // fallback mémoire
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args) => redisClient.call(...args)
  });
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("general"),
  message: { error: "Too many requests, please try again later." }
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("analyze"),
  message: { error: "Too many analyze requests per minute. Please slow down." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("auth"),
  message: { error: "Too many authentication attempts. Try again in 15 minutes." }
});

module.exports = { generalLimiter, analyzeLimiter, authLimiter };
