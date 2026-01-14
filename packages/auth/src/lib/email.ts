import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    console.log("📧 RESEND_API_KEY:", apiKey ? `${apiKey.substring(0, 10)}...` : "(vide)");

    if (!apiKey) {
        return null;
    }
    if (!resendClient) {
        resendClient = new Resend(apiKey);
    }
    return resendClient;
}

export async function sendEmail({
    to,
    subject,
    text,
    html,
}: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) {
    const client = getResendClient();

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
            text,
            html,
        });

        console.log("📧 Resend response:", JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error("❌ Resend error:", error);
        throw error;
    }
}
