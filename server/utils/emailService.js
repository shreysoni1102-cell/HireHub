import nodemailer from 'nodemailer';

/**
 * Creates and returns a Nodemailer transporter.
 * Uses environment variables for configuration so credentials are never hardcoded.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false, // true for port 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use an App Password for Gmail
    },
  });
}

/**
 * Sends an email notification to a job applicant when their status changes.
 *
 * @param {Object} params
 * @param {string} params.toEmail      - Applicant's email address
 * @param {string} params.toName       - Applicant's full name
 * @param {string} params.jobTitle     - Title of the applied-for job
 * @param {string} params.company      - Company name
 * @param {string} params.status       - New status: 'shortlisted' | 'rejected'
 */
export async function sendStatusUpdateEmail({ toEmail, toName, jobTitle, company, status }) {
  // Only send if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Mailer] EMAIL_USER or EMAIL_PASS not set — skipping email notification.');
    return;
  }

  const isShortlisted = status === 'shortlisted';

  const subject = isShortlisted
    ? `🎉 Great news! You've been shortlisted — ${jobTitle} at ${company}`
    : `Update on your application — ${jobTitle} at ${company}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: ${isShortlisted ? '#16a34a' : '#64748b'};">
        ${isShortlisted ? '🎉 Congratulations, You Have Been Shortlisted!' : 'Application Status Update'}
      </h2>
      <p style="color: #334155; font-size: 16px;">Hi <strong>${toName}</strong>,</p>
      <p style="color: #334155; font-size: 15px;">
        We have an update regarding your application for the position of
        <strong>${jobTitle}</strong> at <strong>${company}</strong>.
      </p>
      <div style="background: ${isShortlisted ? '#f0fdf4' : '#f8fafc'}; border-left: 4px solid ${isShortlisted ? '#16a34a' : '#94a3b8'}; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 15px; color: #1e293b;">
          <strong>Status:</strong>
          <span style="color: ${isShortlisted ? '#16a34a' : '#64748b'}; text-transform: capitalize;">${status}</span>
        </p>
        ${
          isShortlisted
            ? '<p style="margin: 8px 0 0; color: #15803d; font-size: 14px;">The recruiter will be in touch with you shortly to discuss the next steps.</p>'
            : '<p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Thank you for applying. We encourage you to keep exploring other opportunities on HireHub.</p>'
        }
      </div>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
        — The HireHub Team
      </p>
    </div>
  `;

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"HireHub" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    });
    console.log(`[Mailer] Status email sent to ${toEmail} — MessageId: ${info.messageId}`);
  } catch (err) {
    // Non-fatal: log but do not crash the request
    console.error('[Mailer] Failed to send email:', err.message);
  }
}
