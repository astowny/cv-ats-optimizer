const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true pour le port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  if (!process.env.SMTP_HOST) {
    // En dev sans SMTP configuré : afficher le lien dans les logs
    logger.warn({ resetUrl }, `[DEV] Password reset link for ${email}`);
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"CV ATS Optimizer" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2563eb">Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous. Ce lien expire dans <strong>1 heure</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#6b7280;font-size:13px">
          Si vous n'avez pas fait cette demande, ignorez cet email.<br>
          Le lien est valable 1 heure.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">CV ATS Optimizer</p>
      </div>
    `
  });

  logger.info({ email }, "Password reset email sent");
}

module.exports = { sendPasswordResetEmail };

