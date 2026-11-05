import nodemailer from 'nodemailer';

let transporter;

export function greetingEmailEnabled() {
  return Boolean(process.env.SMTP_URL);
}

export async function sendGreetingEmail(user, { newAccount = false } = {}) {
  if (!greetingEmailEnabled() || user.demo || user.email === 'admin@lifeos.local') return;
  try {
    if (!transporter) transporter = nodemailer.createTransport(process.env.SMTP_URL);
    const name = (user.name || 'there').trim().split(/\s+/)[0] || 'there';
    const subject = newAccount ? 'Your Life OS space is ready' : 'A little space for you today';
    const text = newAccount
      ? 'Hi ' + name + ',\n\nWelcome to Life OS. Your personal space is ready.\n\nYou do not need to catch up or do everything today. Choose one small thing that matters to you, and let that be enough.\n\nYour tasks, intentions, check-ins, and goals are here whenever you need them.\n\nTake your time,\nThe Life OS team'
      : 'Hi ' + name + ',\n\nWelcome back to Life OS. We are glad you made a little space for yourself today.\n\nStart with one small thing that matters. Your pace is your own.\n\nTake care,\nThe Life OS team';
    const safeName = escapeHtml(name);
    const html = '<div style="max-width:560px;margin:0 auto;padding:32px 24px;color:#34483a;font:16px/1.7 Arial,sans-serif">' +
      '<div style="margin-bottom:24px;color:#527456;font-weight:700;letter-spacing:.08em">lifeOS</div>' +
      '<p>Hi ' + safeName + ',</p>' +
      (newAccount
        ? '<p>Welcome to Life OS. Your personal space is ready.</p><p>You do not need to catch up or do everything today. Choose one small thing that matters to you, and let that be enough.</p><p>Your tasks, intentions, check-ins, and goals are here whenever you need them.</p>'
        : '<p>Welcome back to Life OS. We are glad you made a little space for yourself today.</p><p>Start with one small thing that matters. Your pace is your own.</p>') +
      '<p style="margin-top:28px">Take care,<br />The Life OS team</p></div>';
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Life OS <no-reply@localhost>',
      to: user.email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('Could not send a Life OS greeting email:', error.message);
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}