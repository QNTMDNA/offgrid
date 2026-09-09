import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailResult = { delivered: boolean; id?: string; error?: string };

/**
 * Transactional and campaign email.
 *
 * Without RESEND_API_KEY the transport logs instead of sending, so local and CI
 * runs exercise the same code path without touching a mailbox.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const e = env();
  if (!e.RESEND_API_KEY) {
    console.info(`[email:noop] to=${message.to} subject=${message.subject}`);
    return { delivered: false, id: "noop" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${e.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: e.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  const body = (await response.json()) as { id?: string; message?: string };
  if (!response.ok) {
    return { delivered: false, error: body.message ?? `HTTP ${response.status}` };
  }
  return { delivered: true, id: body.id };
}
