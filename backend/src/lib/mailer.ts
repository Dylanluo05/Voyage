import { env } from '../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const INK = '#151515';
const INK_SOFT = '#5d5d5d';
const INK_FAINT = '#868686';
const ACCENT = '#0b76dd';
const ACCENT_STRONG = '#0862b8';
const BORDER = '#e7e7e7';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function emailLayout(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:32px 16px; background:#f4f4f4; font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
    <tr>
      <td style="padding-bottom:24px; text-align:center;">
        <span style="font-size:20px; font-weight:700; letter-spacing:-0.02em; color:${INK};">Voyage</span>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff; border:1px solid ${BORDER}; border-radius:12px; padding:32px;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding-top:24px; text-align:center;">
        <span style="font-size:12px; color:${INK_FAINT};">Voyage &middot; voyagetravel.app</span>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block; background:${ACCENT}; color:#ffffff; font-weight:600; font-size:15px; text-decoration:none; padding:12px 24px; border-radius:8px;">${label}</a>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.resendApiKey) {
    console.warn(`[mailer] RESEND_API_KEY not set; skipping email to ${to}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.mailFrom, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

export async function sendTripInviteEmail(to: string, inviterName: string, tripTitle: string): Promise<void> {
  const safeName = escapeHtml(inviterName);
  const safeTitle = escapeHtml(tripTitle);
  const link = `${env.clientOrigin}/register?email=${encodeURIComponent(to)}`;
  await sendEmail(
    to,
    `${safeName} invited you to plan "${safeTitle}" on Voyage`,
    emailLayout(
      `<p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${INK_SOFT};">` +
        `<strong style="color:${INK};">${safeName}</strong> invited you to collaborate on ` +
        `<strong style="color:${INK};">${safeTitle}</strong> on Voyage.</p>` +
        `<p style="margin:0 0 24px; text-align:center;">${button(link, 'Create your Voyage account')}</p>` +
        `<p style="margin:0; font-size:13px; line-height:1.5; color:${INK_FAINT};">` +
        `You'll join the trip automatically once you sign up with this email address.</p>`
    )
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${env.clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(
    to,
    'Reset your Voyage password',
    emailLayout(
      `<p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${INK_SOFT};">` +
        `We got a request to reset the password for your Voyage account.</p>` +
        `<p style="margin:0 0 24px; text-align:center;">${button(link, 'Reset your password')}</p>` +
        `<p style="margin:0; font-size:13px; line-height:1.5; color:${INK_FAINT};">` +
        `This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`
    )
  );
}

export async function sendOtpEmail(to: string, code: string, purpose: 'login' | 'register'): Promise<void> {
  const subject = purpose === 'login' ? 'Your Voyage sign-in code' : 'Your Voyage verification code';
  const intro = purpose === 'login' ? 'Use this code to finish signing in:' : 'Use this code to finish creating your account:';
  await sendEmail(
    to,
    subject,
    emailLayout(
      `<p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${INK_SOFT};">${intro}</p>` +
        `<p style="margin:0 0 20px; text-align:center; font-size:36px; font-weight:700; letter-spacing:6px; color:${ACCENT_STRONG};">${code}</p>` +
        `<p style="margin:0; font-size:13px; line-height:1.5; color:${INK_FAINT};">` +
        `This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`
    )
  );
}
