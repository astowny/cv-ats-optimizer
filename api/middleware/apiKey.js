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
  try {
    // 1. Vérifier que la clé existe et est active
    const { rows: found } = await pool.query(
      "SELECT id, plan, monthly_quota FROM api_keys WHERE key_hash = $1 AND is_active = TRUE",
      [keyHash]
    );
    if (found.length === 0) {
      return res.status(401).json({ error: "Invalid or revoked API key." });
    }

    // 2. Incrémenter de façon atomique : reset mensuel + check quota + increment en un seul UPDATE.
    //    Si le quota est dépassé, aucune ligne n'est mise à jour (0 rows returned).
    const { rows: updated } = await pool.query(
      `UPDATE api_keys
       SET
         used_this_month = CASE
           WHEN EXTRACT(YEAR  FROM NOW()) != EXTRACT(YEAR  FROM last_reset_at)
             OR EXTRACT(MONTH FROM NOW()) != EXTRACT(MONTH FROM last_reset_at)
           THEN 1
           ELSE used_this_month + 1
         END,
         last_reset_at = CASE
           WHEN EXTRACT(YEAR  FROM NOW()) != EXTRACT(YEAR  FROM last_reset_at)
             OR EXTRACT(MONTH FROM NOW()) != EXTRACT(MONTH FROM last_reset_at)
           THEN NOW()
           ELSE last_reset_at
         END
       WHERE key_hash = $1
         AND is_active = TRUE
         AND (
           plan = 'pay_per_use'
           OR EXTRACT(YEAR  FROM NOW()) != EXTRACT(YEAR  FROM last_reset_at)
           OR EXTRACT(MONTH FROM NOW()) != EXTRACT(MONTH FROM last_reset_at)
           OR used_this_month < monthly_quota
         )
       RETURNING id, user_id, name, key_prefix, plan, monthly_quota, used_this_month`,
      [keyHash]
    );

    if (updated.length === 0) {
      const { monthly_quota, plan } = found[0];
      return res.status(429).json({
        error: "Monthly quota exceeded.",
        quota: monthly_quota,
        plan,
        upgrade_url: "https://cv-ats-optimizer.com/pricing"
      });
    }

    req.apiKey = updated[0];
    req.authType = "api_key";
    next();
  } catch (err) {
    console.error("API key auth error:", err);
    return res.status(500).json({ error: "Authentication failed." });
  }
}

module.exports = { apiKeyAuth, hashKey, QUOTAS };
