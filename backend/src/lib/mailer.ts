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
    body: JSON.stringify({ from: 'Voyage <onboarding@resend.dev>', to, subject, html }),
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
