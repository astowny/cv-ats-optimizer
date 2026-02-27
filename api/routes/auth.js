const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("../config/database");
const { generateToken, setAuthCookie, clearAuthCookie, verifyJwt } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { sendPasswordResetEmail } = require("../services/email");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: securepassword123
 *     responses:
 *       201:
 *         description: Account created successfully
 *       409:
 *         description: Email already registered
 */
router.post("/register", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash, plan, trial_ends_at) VALUES ($1, $2, 'trial', $3) RETURNING id, email, plan, trial_ends_at",
      [email.toLowerCase().trim(), passwordHash, trialEndsAt]
    );
    const user = rows[0];
    const token = generateToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email, plan: user.plan, trial_ends_at: user.trial_ends_at } });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered." });
    logger.error({ err }, "Registration failed");
    res.status(500).json({ error: "Registration failed." });
  }
});

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Login and get a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials." });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials." });
    const token = generateToken(user);
    setAuthCookie(res, token);
    res.json({ user: { id: user.id, email: user.email, plan: user.plan } });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed." });
  }
});

/**
 * @swagger
 * /v1/auth/me:
 *   get:
 *     summary: Get current user profile and usage stats
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/me", verifyJwt, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, plan, trial_ends_at, analyses_this_month, last_reset_at, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found." });
    const user = rows[0];

    // Auto-downgrade si le trial est expiré
    if (user.plan === "trial" && user.trial_ends_at && new Date() > new Date(user.trial_ends_at)) {
      await pool.query("UPDATE users SET plan = 'free' WHERE id = $1", [user.id]);
      user.plan = "free";
    }

    res.json(user);
  } catch (err) {
    logger.error({ err }, "Failed to fetch profile");
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     summary: Logout and clear the session cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully." });
});

/**
 * @swagger
 * /v1/auth/account:
 *   delete:
 *     summary: Permanently delete your account and all associated data (GDPR)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account and all data deleted
 *       401:
 *         description: Authentication required
 */
router.delete("/account", verifyJwt, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Supprimer les analyses (FK ON DELETE SET NULL ne les supprime pas automatiquement)
    await client.query("DELETE FROM analyses WHERE user_id = $1", [req.user.id]);
    // Supprimer le compte (cascade sur api_keys via FK ON DELETE CASCADE)
    await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    await client.query("COMMIT");
    clearAuthCookie(res);
    res.json({ message: "Account and all associated data permanently deleted." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account." });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent if account exists (always 200 to avoid enumeration)
 */
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  // Toujours répondre 200 pour ne pas révéler si l'email existe
  res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });

  try {
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) return;

    const user = rows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Invalider les anciens tokens
    await pool.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [user.id]
    );
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, tokenHash, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL?.split(",")[0]?.trim() || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    logger.error({ err }, "forgot-password error");
  }
});

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows } = await pool.query(
      `SELECT prt.id, prt.user_id FROM password_reset_tokens prt
       WHERE prt.token_hash = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [tokenHash]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: "Lien invalide ou expiré. Veuillez faire une nouvelle demande." });
    }

    const { id: tokenId, user_id } = rows[0];
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, user_id]);
    await pool.query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [tokenId]);

    clearAuthCookie(res);
    res.json({ message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    logger.error({ err }, "reset-password error");
    res.status(500).json({ error: "Password reset failed." });
  }
});

module.exports = router;
