import { render } from "@react-email/components";
import { Resend } from "resend";
import type { ReactElement } from "react";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  console.log(
    "📧 RESEND_API_KEY:",
    apiKey ? `${apiKey.substring(0, 10)}...` : "(vide)"
  );

  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const client = getResendClient();

  const html = await render(react);
  const text = await render(react, { plainText: true });

  // In development without Resend key, log to console
  if (!client) {
    console.log("📧 Email (dev mode - no RESEND_API_KEY):");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Text: ${text}`);
    return { id: "dev-mode" };
  }

  const from = process.env.EMAIL_FROM || "Conpagina <noreply@conpagina.com>";
  console.log("📧 Sending email via Resend:");
  console.log(`  From: ${from}`);
  console.log(`  To: ${to}`);
  console.log(`  Subject: ${subject}`);

  try {
    const result = await client.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log("📧 Resend response:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("❌ Resend error:", error);
    throw error;
  }
}
