const crypto = require("crypto");
const { pool } = require("../config/database");

const QUOTAS = {
  free: 3,
  pay_per_use: -1,
  pro: 100,
  business: 1000
};

function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function checkAndResetMonthly(client, row) {
  const now = new Date();
  const last = new Date(row.last_reset_at);
  if (now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear()) {
    await client.query(
      "UPDATE api_keys SET used_this_month = 0, last_reset_at = NOW() WHERE id = $1",
      [row.id]
    );
    return 0;
  }
  return row.used_this_month;
}

async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required. Format: Bearer sk-ats-..." });
  }
  const key = authHeader.substring(7);
  if (!key.startsWith("sk-ats-")) {
    return res.status(401).json({ error: "Invalid API key format. Keys must start with sk-ats-" });
  }

  const keyHash = hashKey(key);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = TRUE",
      [keyHash]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid or revoked API key." });
    }
    const apiKey = rows[0];
    const currentUsed = await checkAndResetMonthly(client, apiKey);
    const quota = QUOTAS[apiKey.plan] ?? 3;
    if (quota !== -1 && currentUsed >= quota) {
      return res.status(429).json({
        error: "Monthly quota exceeded.",
        used: currentUsed,
        quota,
        plan: apiKey.plan,
        upgrade_url: "https://cv-ats-optimizer.com/pricing"
      });
    }
    req.apiKey = { ...apiKey, used_this_month: currentUsed };
    req.authType = "api_key";
    next();
  } finally {
    client.release();
  }
}

module.exports = { apiKeyAuth, hashKey, QUOTAS };
