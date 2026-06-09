// emailService � Nodemailer wrapper for sending notification emails
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



/**
 * Sends a verification code email to a user when registering.
 *
 * @param {Object} params
 * @param {string} params.toEmail      - User's email address
 * @param {string} params.toName       - User's full name
 * @param {string} params.code         - Verification code (OTP)
 */
export async function sendVerificationEmail({ toEmail, toName, code }) {
  // Only send if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[Mailer] EMAIL_USER or EMAIL_PASS not set — skipping email verification. Code is: ${code}`);
    return;
  }

  const subject = `🔑 Verification Code for HireHub: ${code}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">Verify Your HireHub Account</h2>
      <p style="color: #64748b; font-size: 14px; margin-top: 0;">Welcome to HireHub!</p>
      <p style="color: #334155; font-size: 15px; margin-top: 20px;">Hi <strong>${toName}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        Thank you for registering. Please use the verification code below to verify your email address and activate your account. This code is valid for 1 hour.
      </p>
      <div style="background: #eff6ff; border: 1px dashed #2563eb; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${code}</span>
      </div>
      <p style="color: #ef4444; font-size: 13px;">
        If you did not request this code, please ignore this email.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 13px;">
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
    console.log(`[Mailer] Verification email sent to ${toEmail} — MessageId: ${info.messageId}`);
  } catch (err) {
    console.error('[Mailer] Failed to send verification email:', err.message);
  }
}


/**
 * Sends a welcome email to a newly verified user, highlighting HireHub features.
 *
 * @param {Object} params
 * @param {string} params.toEmail      - User's email address
 * @param {string} params.toName       - User's full name
 * @param {string} params.role         - User's role: 'user' | 'recruiter' | 'admin'
 */
export async function sendWelcomeEmail({ toEmail, toName, role }) {
  // Only send if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[Mailer] EMAIL_USER or EMAIL_PASS not set — skipping welcome email.`);
    return;
  }

  const isRecruiter = role?.toLowerCase() === 'recruiter';
  const isSeeker = role?.toLowerCase() === 'user';
  
  const subject = isRecruiter 
    ? "Welcome to HireHub! Start hiring developer talent 💼"
    : "Welcome to HireHub! Ready to landing your dream job? 🚀";

  let featuresHtml = "";

  if (isSeeker) {
    featuresHtml = `
      <div style="margin: 24px 0;">
        <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Here are your AI tools to help you succeed:</h3>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #2563eb; font-size: 15px;">🤖 AI Resume ATS Checker</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            Upload your resume or paste text to get an instant, weighted compatibility score, letter grade, and keyword analysis to beat automated filters.
          </p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #2563eb; font-size: 15px;">✨ AI Resume Enhancer & Optimizer</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            Get tailored AI suggestions to enhance your skills description, optimize your keywords, and format your resume for maximum impact.
          </p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #2563eb; font-size: 15px;">💬 AI Interview Practice Simulator</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            Practice realistic voice or text-based mock interviews tailored to any job listing, and get graded instantly with AI analysis before your real-world interviews.
          </p>
        </div>

        <div style="margin-bottom: 16px;">
          <strong style="color: #2563eb; font-size: 15px;">🔗 GitHub Developer Profile Sync</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            Sync your repositories to dynamically compile your developer profile, and highlight your coding experience to potential employers.
          </p>
        </div>
      </div>
    `;
  } else if (isRecruiter) {
    featuresHtml = `
      <div style="margin: 24px 0;">
        <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Start building your team:</h3>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #10b981; font-size: 15px;">💼 Post Tech Job Listings</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            Publish detailed developer positions on our job board and receive structured applicant profiles.
          </p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #10b981; font-size: 15px;">📊 AI Candidate Compatibility Scoring</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            View candidate applications pre-analyzed with GitHub repo metrics, ATS match scores, and interview performance indicators.
          </p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #10b981; font-size: 15px;">⭐ Streamlined Shortlisting & Chat</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px; line-height: 1.4;">
            Shortlist matching candidates directly from your dashboard and communicate with them instantly via built-in real-time chat.
          </p>
        </div>
      </div>
    `;
  } else {
    // Fallback welcome message
    featuresHtml = `
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">
        Welcome to HireHub! Your account has been verified, and you can now log in and manage platform operations.
      </p>
    `;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <div style="width: 40px; height: 40px; border-radius: 8px; bg-color: #2563eb; background: #2563eb; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 20px; text-align: center; line-height: 40px; margin-right: 12px;">H</div>
        <span style="font-size: 20px; font-weight: bold; color: #0f172a;">HireHub</span>
      </div>
      
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Hi ${toName}, Welcome to HireHub! 🎉</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-top: 4px;">
        Your email address has been verified successfully. Your account is now active and ready to use!
      </p>
      
      ${featuresHtml}
      
      <div style="text-align: center; margin-top: 32px; margin-bottom: 12px;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" 
           style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
           Go to HireHub Dashboard
        </a>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
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
    console.log(`[Mailer] Welcome email sent to ${toEmail} — MessageId: ${info.messageId}`);
  } catch (err) {
    console.error('[Mailer] Failed to send welcome email:', err.message);
  }
}


/**
 * Sends a password reset verification email.
 *
 * @param {Object} params
 * @param {string} params.toEmail      - User's email address
 * @param {string} params.toName       - User's full name
 * @param {string} params.code         - 6-digit password reset code
 */
export async function sendPasswordResetEmail({ toEmail, toName, code }) {
  // Only send if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Mailer] EMAIL_USER or EMAIL_PASS not set - skipping password reset email.');
    return;
  }

  const subject = 'Reset your HireHub password';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <div style="width: 40px; height: 40px; border-radius: 8px; background: #2563eb; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 20px; text-align: center; line-height: 40px; margin-right: 12px;">H</div>
        <span style="font-size: 20px; font-weight: bold; color: #0f172a;">HireHub</span>
      </div>
      
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-top: 4px;">
        Hi ${toName}, we received a request to reset your password. Use the verification code below to verify your identity and choose a new password. This code is valid for 1 hour.
      </p>
      
      <div style="background: #eff6ff; border: 1px dashed #2563eb; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${code}</span>
      </div>
      
      <p style="color: #ef4444; font-size: 13px;">
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
        - The HireHub Team
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
    console.log(`[Mailer] Password reset email sent to ${toEmail} - MessageId: ${info.messageId}`);
  } catch (err) {
    console.error('[Mailer] Failed to send password reset email:', err.message);
  }
}
