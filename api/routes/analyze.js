const express = require("express");
const multer = require("multer");
const { pool } = require("../config/database");
const { verifyJwt } = require("../middleware/auth");
const { apiKeyAuth, QUOTAS } = require("../middleware/apiKey");
const { analyzeLimiter } = require("../middleware/rateLimit");
const { analyzeCV } = require("../services/openai");
const { extractTextFromPdf } = require("../services/pdf");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted."), false);
  }
});

async function flexAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  // Les API keys passent toujours par l'en-tête Authorization
  if (authHeader && authHeader.startsWith("Bearer sk-ats-")) {
    return apiKeyAuth(req, res, next);
  }
  // Les utilisateurs web utilisent le cookie httpOnly
  return verifyJwt(req, res, next);
}

/**
 * Vérifie et applique le quota pour les utilisateurs web (JWT).
 * Les API keys ont leur propre quota atomique dans apiKeyAuth.
 */
async function checkWebUserQuota(req, res, next) {
  if (req.authType === "api_key") return next(); // déjà géré

  try {
    const { rows } = await pool.query(
      "SELECT plan, trial_ends_at, analyses_this_month, last_reset_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(401).json({ error: "User not found." });

    let { plan, trial_ends_at, analyses_this_month, last_reset_at } = rows[0];

    // Auto-downgrade trial expiré
    if (plan === "trial" && trial_ends_at && new Date() > new Date(trial_ends_at)) {
      plan = "free";
      await pool.query("UPDATE users SET plan = 'free' WHERE id = $1", [req.user.id]);
    }

    const quota = QUOTAS[plan] ?? 3;

    if (quota !== -1) {
      // Reset mensuel
      const now = new Date();
      const lastReset = new Date(last_reset_at);
      let usedThisMonth = analyses_this_month;
      if (now.getFullYear() !== lastReset.getFullYear() || now.getMonth() !== lastReset.getMonth()) {
        usedThisMonth = 0;
        await pool.query("UPDATE users SET analyses_this_month = 0, last_reset_at = NOW() WHERE id = $1", [req.user.id]);
      }

      if (usedThisMonth >= quota) {
        return res.status(429).json({
          error: "Quota mensuel atteint.",
          quota,
          plan,
          upgrade_url: `${process.env.FRONTEND_URL?.split(",")[0]?.trim() || ""}/pricing`
        });
      }
    }

    req.webUserPlan = plan;
    next();
  } catch (err) {
    console.error("Quota check error:", err);
    res.status(500).json({ error: "Authentication failed." });
  }
}

async function incrementUsage(req) {
  // Pour les API keys, l'incrément est déjà fait atomiquement dans apiKeyAuth.
  // On incrémente uniquement le compteur utilisateur (JWT web).
  if (req.authType !== "api_key") {
    await pool.query(
      "UPDATE users SET analyses_this_month = analyses_this_month + 1 WHERE id = $1",
      [req.user.id]
    );
  }
}

function getQuotaRemaining(req) {
  if (req.authType === "api_key") {
    const quota = req.apiKey.monthly_quota ?? QUOTAS[req.apiKey.plan] ?? 3;
    if (quota === -1) return -1;
    // used_this_month est déjà la valeur post-increment retournée par l'UPDATE atomique
    return Math.max(0, quota - req.apiKey.used_this_month);
  }
  return null;
}

/**
 * @swagger
 * /v1/analyze:
 *   post:
 *     summary: Analyze a CV against a job description
 *     tags: [Analyze]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cv_file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file (max 5MB)
 *               cv_text:
 *                 type: string
 *                 description: CV text (alternative to cv_file)
 *               job_description:
 *                 type: string
 *                 description: Job description (min 50 chars)
 *               language:
 *                 type: string
 *                 enum: [fr, en]
 *                 default: fr
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cv_text, job_description]
 *             properties:
 *               cv_text:
 *                 type: string
 *               job_description:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [fr, en]
 *                 default: fr
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Quota exceeded or rate limit
 */
router.post("/", analyzeLimiter, flexAuth, checkWebUserQuota, upload.single("cv_file"), async (req, res) => {
  try {
    let cvText = req.body.cv_text || "";
    const jobDescription = req.body.job_description || "";
    const language = req.body.language || "fr";

    if (!["fr", "en"].includes(language)) {
      return res.status(400).json({ error: "Language must be 'fr' or 'en'." });
    }

    if (req.file) {
      try {
        cvText = await extractTextFromPdf(req.file.buffer);
      } catch (pdfErr) {
        return res.status(400).json({ error: pdfErr.message });
      }
    }

    if (!cvText || cvText.trim().length < 100) {
      return res.status(400).json({ error: "CV text must be at least 100 characters. Upload a PDF or paste the text." });
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({ error: "Job description must be at least 50 characters." });
    }

    const { result, tokensUsed } = await analyzeCV(cvText.trim(), jobDescription.trim(), language);

    const userId = req.authType === "api_key" ? req.apiKey.user_id : req.user.id;
    const apiKeyId = req.authType === "api_key" ? req.apiKey.id : null;

    const { rows } = await pool.query(
      `INSERT INTO analyses (user_id, api_key_id, language, ats_score, result, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [userId, apiKeyId, language, result.ats_score, JSON.stringify(result), tokensUsed]
    );

    await incrementUsage(req);
    const quotaRemaining = getQuotaRemaining(req);

    res.json({
      id: rows[0].id,
      created_at: rows[0].created_at,
      ats_score: result.ats_score,
      matching_keywords: result.matching_keywords,
      missing_keywords: result.missing_keywords,
      strengths: result.strengths,
      improvements: result.improvements,
      suggestions: result.suggestions,
      summary: result.summary,
      tokens_used: tokensUsed,
      ...(quotaRemaining !== null && { quota_remaining: quotaRemaining })
    });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

/**
 * @swagger
 * /v1/analyze/history:
 *   get:
 *     summary: Get your last 20 analyses
 *     tags: [Analyze]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of past analyses
 */
router.get("/history", verifyJwt, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, language, ats_score,
              result->>'summary' AS summary,
              tokens_used, created_at
       FROM analyses WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

module.exports = router;
