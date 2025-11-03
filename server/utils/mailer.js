// server/utils/mailer.js
const nodemailer = require('nodemailer');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (user && pass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    try {
      await transporter.verify();
      console.log('📬 Mailer ready (Gmail) as', user);
    } catch (e) {
      console.log('⚠️ Gmail SMTP verify FAILED:', e.message, '→ Falling back to console mailer');
      transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.log('📬 Console mailer active (missing EMAIL_USER/PASS) — emails will be logged only');
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  const t = await getTransporter();
  const from = process.env.EMAIL_USER || 'imar@local';
  const info = await t.sendMail({ from, to, subject, html });

  if (t.options?.jsonTransport) {
    try {
      const parsed = typeof info.message === 'string' ? JSON.parse(info.message) : info.message;
      console.log('✉️ Email (console):', JSON.stringify(parsed, null, 2));
    } catch {
      console.log('✉️ Email (console, raw):', info.message);
    }
  }
  return info;
}

async function sendOtp(email, code) {
  const html = `<p>Your iMarma Therapy OTP is <b>${code}</b>. It expires in 10 minutes.</p>`;
  return sendMail(email, 'Your OTP Code', html);
}

module.exports = { sendOtp, sendMail };
