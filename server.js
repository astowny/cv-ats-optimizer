require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { initDb } = require("./api/config/database");
const { generalLimiter } = require("./api/middleware/rateLimit");

const authRoutes = require("./api/routes/auth");
const analyzeRoutes = require("./api/routes/analyze");
const keysRoutes = require("./api/routes/keys");

const app = express();
const PORT = process.env.PORT || 3001;

// Sécurité : headers HTTP (X-Frame-Options, HSTS, X-Content-Type-Options, etc.)
// CSP permissif pour Swagger UI (inline scripts nécessaires)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:3000",
  credentials: true, // nécessaire pour les cookies httpOnly
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CV ATS Optimizer API",
      version: "1.0.0",
      description: "API-first CV/ATS optimization tool. Analyze resumes against job descriptions using AI.\n\n## Authentication\nUse `Bearer <token>` with either:\n- A **JWT token** (from /v1/auth/login) for web users\n- An **API key** (`sk-ats-...`) for programmatic access",
      contact: {
        name: "API Support",
        url: "https://github.com/your-username/cv-ats-optimizer"
      },
      license: {
        name: "MIT"
      }
    },
    servers: [
      { url: "http://localhost:3001", description: "Development" },
      { url: "https://api.cv-ats-optimizer.com", description: "Production" }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT or API Key",
          description: "Use a JWT token from /v1/auth/login OR an API key starting with sk-ats-"
        }
      }
    }
  },
  apis: ["./api/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "CV ATS Optimizer — API Docs"
}));

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    name: "CV ATS Optimizer API",
    version: "1.0.0",
    docs: "/docs",
    endpoints: {
      auth: "/v1/auth",
      analyze: "/v1/analyze",
      keys: "/v1/keys"
    }
  });
});

app.use("/v1/auth", authRoutes);
app.use("/v1/analyze", analyzeRoutes);
app.use("/v1/keys", keysRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found. See /docs for available endpoints." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
  }
  res.status(500).json({ error: "Internal server error." });
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API docs: http://localhost:${PORT}/docs`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
