const express = require("express");
const crypto = require("crypto");
const { pool } = require("../config/database");
const { verifyJwt } = require("../middleware/auth");
const { hashKey, QUOTAS } = require("../middleware/apiKey");

const router = express.Router();

function generateApiKey() {
  const random = crypto.randomBytes(32).toString("base64url");
  return "sk-ats-" + random;
}

/**
 * @swagger
 * /v1/keys:
 *   get:
 *     summary: List all your API keys
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys (secrets are never returned)
 */
router.get("/", verifyJwt, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, key_prefix, plan, monthly_quota, used_this_month,
              last_reset_at, is_active, created_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list API keys." });
  }
});

/**
 * @swagger
 * /v1/keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My production app"
 *               plan:
 *                 type: string
 *                 enum: [free, pay_per_use, pro, business]
 *                 default: free
 *     responses:
 *       201:
 *         description: API key created. The full key is shown ONLY ONCE.
 */
router.post("/", verifyJwt, async (req, res) => {
  const { name, plan = "free" } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (!Object.keys(QUOTAS).includes(plan)) {
    return res.status(400).json({ error: "Invalid plan. Use: free, pay_per_use, pro, business" });
  }
  const key = generateApiKey();
  const prefix = key.substring(0, 14);
  const keyHash = hashKey(key);
  const monthlyQuota = QUOTAS[plan];
  try {
    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash, plan, monthly_quota)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, plan, monthly_quota, created_at`,
      [req.user.id, name.trim(), prefix, keyHash, plan, monthlyQuota]
    );
    res.status(201).json({
      ...rows[0],
      key,
      warning: "Save this key now. For security reasons, it will NOT be shown again."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create API key." });
  }
});

/**
 * @swagger
 * /v1/keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 *       404:
 *         description: Key not found
 */
router.delete("/:id", verifyJwt, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "API key not found." });
    res.json({ message: "API key revoked successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to revoke API key." });
  }
});

module.exports = router;
