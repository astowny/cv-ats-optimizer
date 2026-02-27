const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // pino-pretty en dev pour lisibilité, JSON structuré en prod
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } }
  })
});

module.exports = logger;

