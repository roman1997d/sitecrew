const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function isEmailConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.emailFrom);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSiteUrl() {
  return env.publicUrl.replace(/\/$/, '') || 'https://sitecrew.uk';
}

function getContactEmail() {
  return env.contactEmail || 'info@sitecrew.uk';
}

function getLogoUrl() {
  return `${getSiteUrl()}/assets/logo.png`;
}

function getBrandFooterText() {
  const siteUrl = getSiteUrl();
  const contactEmail = getContactEmail();
  return [
    '',
    '—',
    'Thank you for being part of SiteCrew.uk.',
    'We are here if you need any help.',
    `Contact: ${contactEmail}`,
    `Website: ${siteUrl}`,
    '',
    'Kind regards,',
    'The SiteCrew.uk Team',
  ].join('\n');
}

function buildBrandFooterHtml() {
  const siteUrl = escapeHtml(getSiteUrl());
  const contactEmail = escapeHtml(getContactEmail());
  const logoUrl = escapeHtml(getLogoUrl());

  return `
            <tr>
              <td style="padding:24px 28px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding:0 0 14px;">
                      <a href="${siteUrl}" style="text-decoration:none;">
                        <img src="${logoUrl}" alt="SiteCrew.uk" width="140" style="display:block;width:140px;max-width:60%;height:auto;border:0;">
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 0 10px;font-size:14px;line-height:1.6;color:#334155;">
                      Thank you for being part of <strong>SiteCrew.uk</strong>.<br>
                      We are here if you need any help.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 0 6px;font-size:13px;line-height:1.6;color:#64748b;">
                      Contact:
                      <a href="mailto:${contactEmail}" style="color:#2563eb;text-decoration:none;font-weight:600;">${contactEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 0 12px;font-size:13px;line-height:1.6;color:#64748b;">
                      <a href="${siteUrl}" style="color:#2563eb;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size:13px;line-height:1.6;color:#94a3b8;">
                      Kind regards,<br>
                      The SiteCrew.uk Team
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
}

function buildBrandHeaderHtml(title) {
  const siteUrl = escapeHtml(getSiteUrl());
  const logoUrl = escapeHtml(getLogoUrl());
  const safeTitle = escapeHtml(title || 'SiteCrew.uk');

  return `
            <tr>
              <td style="padding:22px 28px 18px;background:linear-gradient(135deg,#0b1f3b,#2563eb);color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="left" style="padding:0 0 12px;">
                      <a href="${siteUrl}" style="text-decoration:none;">
                        <img src="${logoUrl}" alt="SiteCrew.uk" width="132" style="display:block;width:132px;max-width:55%;height:auto;border:0;background:#ffffff;border-radius:10px;padding:8px 10px;">
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">SiteCrew.uk</div>
                      <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#ffffff;">${safeTitle}</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
}

function wrapBrandedEmailHtml({ title, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            ${buildBrandHeaderHtml(title)}
            <tr>
              <td style="padding:28px;">
                ${bodyHtml}
              </td>
            </tr>
            ${buildBrandFooterHtml()}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function appendBrandFooterText(lines = []) {
  return [...lines, getBrandFooterText()].join('\n');
}

async function sendMail(mailOptions = {}) {
  const { resolveOutboundEmail } = require('../modules/admin/emailControl/settings');
  const routed = await resolveOutboundEmail(mailOptions.to);
  const payload = {
    ...mailOptions,
    to: routed.to,
  };

  if (routed.testMode) {
    const original = routed.originalTo || 'unknown';
    payload.subject = `[TEST → ${original}] ${mailOptions.subject || ''}`.trim();
    if (typeof payload.text === 'string') {
      payload.text = `TEST MODE: originally to ${original}\n\n${payload.text}`;
    }
    if (typeof payload.html === 'string') {
      payload.html = `<p style="margin:0 0 16px;padding:10px 12px;background:#FEF3C7;color:#92400E;border-radius:8px;font-size:13px;">TEST MODE — originally to <strong>${escapeHtml(String(original))}</strong></p>${payload.html}`;
    }
  }

  return getTransporter().sendMail(payload);
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const from = `"${env.emailFromName}" <${env.emailFrom}>`;
  const subject = 'Reset your SiteCrew.uk password';
  const safeUrl = escapeHtml(resetUrl);

  const bodyHtml = `
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  We received a request to reset the password for your SiteCrew.uk account.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#334155;">
                  Click the button below to choose a new password. This link expires in ${env.passwordResetTtlMinutes} minutes.
                </p>
                <p style="margin:0 0 28px;text-align:center;">
                  <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;">
                    Reset password
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 16px;font-size:13px;line-height:1.6;word-break:break-all;color:#2563eb;">
                  ${safeUrl}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  If you did not request this, you can safely ignore this email.
                </p>`;

  const html = wrapBrandedEmailHtml({
    title: 'Reset your password',
    bodyHtml,
  });

  const text = appendBrandFooterText([
    'Reset your SiteCrew.uk password',
    '',
    'We received a request to reset the password for your SiteCrew.uk account.',
    `Open this link to choose a new password (expires in ${env.passwordResetTtlMinutes} minutes):`,
    resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
  ]);

  await sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

function getDashboardUrl(role) {
  const baseUrl = getSiteUrl();
  if (role === 'company') {
    return `${baseUrl}/company/dashboard`;
  }
  return `${baseUrl}/worker/dashboard`;
}

async function sendWelcomeEmail({ to, role, name }) {
  const from = `"${env.emailFromName}" <${env.emailFrom}>`;
  const safeName = escapeHtml(name || 'there');
  const dashboardUrl = getDashboardUrl(role);
  const safeDashboardUrl = escapeHtml(dashboardUrl);
  const isCompany = role === 'company';

  const subject = isCompany
    ? 'Welcome to SiteCrew.uk — your company account is ready'
    : 'Welcome to SiteCrew.uk — your worker account is ready';

  const headline = isCompany ? 'Welcome aboard' : 'Welcome to SiteCrew.uk';
  const intro = isCompany
    ? `Hi ${safeName}, thanks for registering your company on SiteCrew.uk.`
    : `Hi ${safeName}, thanks for joining SiteCrew.uk as a worker.`;

  const steps = isCompany
    ? [
        'Complete your company profile and add your logo',
        'Post jobs and reach skilled workers in your area',
        'Review applicants and manage your team from the dashboard',
      ]
    : [
        'Complete your profile and showcase your skills',
        'Browse open jobs matched to your trade',
        'Apply directly and connect with companies',
      ];

  const stepsHtml = steps
    .map((step) => `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(step)}</li>`)
    .join('');

  const ctaLabel = isCompany ? 'Go to company dashboard' : 'Go to worker dashboard';

  const bodyHtml = `
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  ${intro}
                </p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#334155;font-weight:700;">
                  Here is how to get started:
                </p>
                <ul style="margin:0 0 24px;padding-left:20px;">
                  ${stepsHtml}
                </ul>
                <p style="margin:0 0 8px;text-align:center;">
                  <a href="${safeDashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;">
                    ${ctaLabel}
                  </a>
                </p>`;

  const html = wrapBrandedEmailHtml({
    title: headline,
    bodyHtml,
  });

  const text = appendBrandFooterText([
    subject,
    '',
    isCompany
      ? `Hi ${name || 'there'}, thanks for registering your company on SiteCrew.uk.`
      : `Hi ${name || 'there'}, thanks for joining SiteCrew.uk as a worker.`,
    '',
    'Here is how to get started:',
    ...steps.map((step) => `- ${step}`),
    '',
    `Open your dashboard: ${dashboardUrl}`,
  ]);

  await sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

function getJobAlertReasonText(alertReason, companyName) {
  const safeCompany = companyName || 'this company';

  if (alertReason === 'follow') {
    return `You are receiving this email because you follow ${safeCompany} on SiteCrew.uk.`;
  }

  if (alertReason === 'both') {
    return `You are receiving this email because you follow ${safeCompany} and your trade interests match this job type.`;
  }

  return 'You are receiving this email because your trade interests match this job type.';
}

async function sendNewJobAlertEmail({
  to,
  workerName,
  companyName,
  jobTitle,
  jobUrl,
  alertReason = 'interest',
}) {
  const from = `"${env.emailFromName}" <${env.emailFrom}>`;
  const safeCompanyName = escapeHtml(companyName || 'A company');
  const safeJobTitle = escapeHtml(jobTitle || 'New job');
  const safeWorkerName = escapeHtml(workerName || 'there');
  const safeJobUrl = escapeHtml(jobUrl);
  const siteUrl = escapeHtml(getSiteUrl());
  const reasonText = getJobAlertReasonText(alertReason, companyName);
  const safeReasonText = escapeHtml(reasonText);

  const subject = `${companyName || 'A company'} just posted a job: ${jobTitle || 'New job'}`;

  const bodyHtml = `
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  Hi ${safeWorkerName},
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  <strong>${safeCompanyName}</strong> just posted a job <strong>&ldquo;${safeJobTitle}&rdquo;</strong>.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#64748b;">
                  ${safeReasonText}
                </p>
                <p style="margin:0 0 28px;text-align:center;">
                  <a href="${safeJobUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;">
                    View job on SiteCrew.uk
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#64748b;">
                  For more details, visit <a href="${siteUrl}" style="color:#2563eb;text-decoration:none;">sitecrew.uk</a>.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;color:#2563eb;">
                  ${safeJobUrl}
                </p>`;

  const html = wrapBrandedEmailHtml({
    title: 'New job alert',
    bodyHtml,
  });

  const text = appendBrandFooterText([
    subject,
    '',
    `Hi ${workerName || 'there'},`,
    '',
    `${companyName || 'A company'} just posted a job "${jobTitle || 'New job'}".`,
    '',
    reasonText,
    '',
    `View job: ${jobUrl}`,
    `Visit SiteCrew.uk: ${getSiteUrl()}`,
  ]);

  await sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

async function sendContactFormEmail({ to, name, email, subject, message }) {
  const from = `"${env.emailFromName}" <${env.emailFrom}>`;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  const mailSubject = `[SiteCrew.uk Contact] ${subject}`;

  const bodyHtml = `
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;"><strong>Name:</strong> ${safeName}</p>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;"><strong>Email:</strong> ${safeEmail}</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;"><strong>Subject:</strong> ${safeSubject}</p>
                <div style="padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">${safeMessage}</p>
                </div>`;

  const html = wrapBrandedEmailHtml({
    title: 'New contact form message',
    bodyHtml,
  });

  const text = appendBrandFooterText([
    mailSubject,
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    '',
    message,
  ]);

  await sendMail({
    from,
    to,
    replyTo: email,
    subject: mailSubject,
    text,
    html,
  });
}

async function sendNotificationEmail({
  to,
  name,
  subject,
  intro,
  details = [],
  ctaLabel = 'Open SiteCrew.uk',
  ctaUrl,
}) {
  const from = `"${env.emailFromName}" <${env.emailFrom}>`;
  const safeName = escapeHtml(name || 'there');
  const safeIntro = escapeHtml(intro || '');
  const actionUrl = ctaUrl || getSiteUrl();
  const safeCtaUrl = escapeHtml(actionUrl);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const detailsHtml = (details || [])
    .filter(Boolean)
    .map((line) => `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(line)}</li>`)
    .join('');

  const bodyHtml = `
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">${safeIntro}</p>
                ${detailsHtml ? `<ul style="margin:0 0 24px;padding-left:20px;">${detailsHtml}</ul>` : ''}
                <p style="margin:0 0 28px;text-align:center;">
                  <a href="${safeCtaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;">
                    ${safeCtaLabel}
                  </a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button does not work, copy this link: ${safeCtaUrl}
                </p>`;

  const html = wrapBrandedEmailHtml({
    title: subject,
    bodyHtml,
  });

  const text = appendBrandFooterText([
    subject,
    '',
    `Hi ${name || 'there'},`,
    '',
    intro || '',
    ...(details || []).map((line) => `- ${line}`),
    '',
    `${ctaLabel}: ${actionUrl}`,
  ]);

  await sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNewJobAlertEmail,
  sendContactFormEmail,
  sendNotificationEmail,
};
