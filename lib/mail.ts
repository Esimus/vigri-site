// lib/mail.ts

// Minimal mail stub used during development and tests.
// In dev: logs the email payload to console and resolves.
// In production: throws unless a real transport is configured.

export type MailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

function hasProdConfig(): boolean {
  // Extend this check when you wire a real provider
  return Boolean(
    process.env.SMTP_HOST ||
      process.env.RESEND_API_KEY ||
      process.env.MAILGUN_API_KEY
  );
}

export async function sendMail(input: MailInput): Promise<void> {
  const { to, subject, text, html } = input;
  const from = input.from ?? process.env.MAIL_FROM ?? 'no-reply@vigri.app';

  if (!to || !subject) {
    throw new Error('sendMail: missing "to" or "subject"');
  }

  const env = process.env.NODE_ENV || 'development';

  if (env !== 'production') {
    // Dev stub: do not actually send
    // Keep this log — it is handy during local testing
    // eslint-disable-next-line no-console
    console.info('[mail:dev] not sent', { from, to, subject, text, html });
    return;
  }

  // Production guard: fail fast if no transport configured
  if (!hasProdConfig()) {
    throw new Error(
      'Mail transport is not configured. Set SMTP_* or a provider API key.'
    );
  }

  // TODO: Implement real send using your provider (SMTP/Resend/Mailgun/etc.)
  // Intentionally throw to avoid silent success in production without an implementation.
  throw new Error('Production mail sending not implemented yet.');
}

/** Send verification email with a link (email confirm) */
export async function sendVerifyEmail(to: string, link: string) {
  const subject = 'Verify your email for VIGRI';
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

/** Send password reset email with a link (?auth=reset&token=...) */
export async function sendResetEmail(to: string, link: string) {
  const subject = 'Reset your VIGRI password';
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
