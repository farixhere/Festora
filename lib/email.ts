import "server-only";

/**
 * Minimal transactional email via Resend's HTTP API (no SDK dependency).
 * When RESEND_API_KEY / EMAIL_FROM are not set, nothing is sent and callers
 * must tell the user so (we never pretend an email went out).
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
