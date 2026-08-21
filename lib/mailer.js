const nodemailer = require("nodemailer");

// Same pattern as the Makeni Central admin server: Gmail SMTP with a
// 16-character App Password (NOT your normal Gmail password — Google
// requires 2-Step Verification to be on before it'll let you generate
// one, under Google Account → Security → App passwords).
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function sendPasswordResetEmail({ to, username, resetUrl }) {
  return mailer.sendMail({
    from: `"Bee Cee Logistics Admin" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your dashboard password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e2e2e2">
        <div style="text-align:center;margin-bottom:24px">
          <h2 style="margin:12px 0 4px;color:#3B4A1E;font-size:18px">Bee Cee Logistics</h2>
          <p style="color:#777;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0">Fleet Dashboard</p>
        </div>
        <p style="color:#1a1c1c;font-size:15px">Hi <strong>${username}</strong>,</p>
        <p style="color:#45464e;font-size:14px;line-height:1.6">
          We received a request to reset your dashboard password. Click the button below to choose a new one.
          This link will expire in <strong>1 hour</strong>.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="background:#3B4A1E;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">
            Reset Password
          </a>
        </div>
        <p style="color:#888;font-size:12px;line-height:1.6">
          If you didn't request this, you can safely ignore this email — your password will remain unchanged.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:11px;text-align:center">Bee Cee Logistics Ltd — Fleet Dashboard</p>
      </div>
    `,
  });
}

module.exports = { mailer, sendPasswordResetEmail };
