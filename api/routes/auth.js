const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { generateToken, setAuthCookie, clearAuthCookie, verifyJwt } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
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
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, plan",
      [email.toLowerCase().trim(), passwordHash]
    );
    const user = rows[0];
    const token = generateToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email, plan: user.plan } });
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
      "SELECT id, email, plan, analyses_this_month, last_reset_at, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found." });
    res.json(rows[0]);
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

module.exports = router;
