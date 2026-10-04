import { env } from '../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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
    `<p>${safeName} invited you to collaborate on <strong>${safeTitle}</strong> on Voyage.</p>` +
      `<p><a href="${link}">Create your Voyage account</a> to join the trip automatically.</p>`
  );
}

export async function sendOtpEmail(to: string, code: string, purpose: 'login' | 'register'): Promise<void> {
  const subject = purpose === 'login' ? 'Your Voyage sign-in code' : 'Your Voyage verification code';
  const intro = purpose === 'login' ? 'Use this code to finish signing in:' : 'Use this code to finish creating your account:';
  await sendEmail(
    to,
    subject,
    `<p>${intro}</p>` +
      `<p style="font-size: 32px; font-weight: 700; letter-spacing: 4px;">${code}</p>` +
      `<p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`
  );
}
