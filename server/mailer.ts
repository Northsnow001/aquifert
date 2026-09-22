/**
 * Transactional mailer.
 *
 * Production: set SMTP_URL (e.g. Amazon SES SMTP, Postmark, SendGrid,
 * Mailgun or Google Workspace relay) in the environment. SPF, DKIM and
 * DMARC must be published for aquifert.com, that is an ops/DNS task and
 * a hard launch prerequisite for the OTP flow.
 *
 * Development: codes are written to the server log (never returned to the
 * client except in non-production where the response carries a devCode).
 */
export async function sendTransactional(to: string, subject: string, text: string): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  // Minimal SMTP send via nodemailer when configured.
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "Aquifert <no-reply@aquifert.com>",
    to,
    subject,
    text,
  });
}
