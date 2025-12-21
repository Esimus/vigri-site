// lib/mail.ts
// Mail sending via Mailjet SMTP. Text content is defined here for now;
// i18n integration can be wired later at the call sites.

import nodemailer from "nodemailer";

export type MailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

function hasProdConfig(): boolean {
  return Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS
  );
}

const DEFAULT_FROM = process.env.MAIL_FROM ?? "VIGRI <noreply@vigri.ee>";
const DEFAULT_REPLY_TO = process.env.MAIL_REPLY_TO ?? undefined;

const mailTransport = hasProdConfig()
  ? nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false, // STARTTLS on 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    })
  : null;

/**
 * Core mail sender.
 * - In non-production: logs to console and does not send.
 * - In production: sends via Mailjet SMTP.
 */
export async function sendMail(input: MailInput): Promise<void> {
  const { to, subject, text, html } = input;
  const from = input.from ?? DEFAULT_FROM;
  const replyTo = DEFAULT_REPLY_TO;
  const env = process.env.NODE_ENV || "development";

  if (!to || !subject) {
    throw new Error('sendMail: missing "to" or "subject"');
  }

  if (env !== "production") {
    console.info("[mail:dev] not sent", {
      from,
      to,
      subject,
      text,
      html,
      replyTo,
    });
    return;
  }

  if (!hasProdConfig() || !mailTransport) {
    throw new Error(
      "Mail transport is not configured. Set MAIL_HOST / MAIL_USER / MAIL_PASS in environment."
    );
  }

  await mailTransport.sendMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo,
  });
}

/**
 * Send verification email with a link (email confirm).
 * Signature kept as before: (to, link).
 */
export async function sendVerifyEmail(to: string, link: string) {
  const subject = "Verify your email for VIGRI";
  const html = `
    <p>To verify your email, click the link below:</p>
    <p><a href="${link}">${link}</a></p>
    <p>If you didn’t request this, you can ignore this email.</p>
  `;
  const text =
    `To verify your email, open this link: ${link}\n` +
    `If you didn't request this, ignore this email.`;

  await sendMail({ to, subject, html, text });
}

/**
 * Send password reset email with a link (?auth=reset&token=...).
 * Signature kept as before: (to, link).
 */
export async function sendResetEmail(to: string, link: string) {
  const subject = "Reset your VIGRI password";
  const html = `
    <p>To reset your password, click the link below:</p>
    <p><a href="${link}">${link}</a></p>
    <p>The link is valid for 1 hour. If you didn't request this, you can ignore this email.</p>
  `;
  const text =
    `To reset your password, open this link: ${link}\n` +
    `The link is valid for 1 hour. If you didn't request this, ignore this email.`;

  await sendMail({ to, subject, html, text });
}
