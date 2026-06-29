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

async function sendPasswordResetEmail({ to, resetUrl }) {
  const from = `"${env.emailFromName}" <${env.emailFrom}>`;
  const subject = 'Reset your SiteCrew password';
  const safeUrl = escapeHtml(resetUrl);

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;background:linear-gradient(135deg,#0b1f3b,#2563eb);color:#ffffff;">
                <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">SiteCrew</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  We received a request to reset the password for your SiteCrew account.
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
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;color:#2563eb;">
                  ${safeUrl}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Reset your SiteCrew password',
    '',
    'We received a request to reset the password for your SiteCrew account.',
    `Open this link to choose a new password (expires in ${env.passwordResetTtlMinutes} minutes):`,
    resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

function getDashboardUrl(role) {
  const baseUrl = env.publicUrl.replace(/\/$/, '');
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
    ? 'Welcome to SiteCrew — your company account is ready'
    : 'Welcome to SiteCrew — your worker account is ready';

  const headline = isCompany ? 'Welcome aboard' : 'Welcome to SiteCrew';
  const intro = isCompany
    ? `Hi ${safeName}, thanks for registering your company on SiteCrew.`
    : `Hi ${safeName}, thanks for joining SiteCrew as a worker.`;

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

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;background:linear-gradient(135deg,#0b1f3b,#2563eb);color:#ffffff;">
                <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">SiteCrew</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${headline}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  ${intro}
                </p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#334155;font-weight:700;">
                  Here is how to get started:
                </p>
                <ul style="margin:0 0 24px;padding-left:20px;">
                  ${stepsHtml}
                </ul>
                <p style="margin:0 0 28px;text-align:center;">
                  <a href="${safeDashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;">
                    ${ctaLabel}
                  </a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  Need help? Contact us at ${escapeHtml(env.emailFrom)}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    subject,
    '',
    isCompany
      ? `Hi ${name || 'there'}, thanks for registering your company on SiteCrew.`
      : `Hi ${name || 'there'}, thanks for joining SiteCrew as a worker.`,
    '',
    'Here is how to get started:',
    ...steps.map((step) => `- ${step}`),
    '',
    `Open your dashboard: ${dashboardUrl}`,
    '',
    `Need help? Contact us at ${env.emailFrom}.`,
  ].join('\n');

  await getTransporter().sendMail({
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
    return `You are receiving this email because you follow ${safeCompany} on SiteCrew.`;
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
  const siteUrl = escapeHtml(env.publicUrl.replace(/\/$/, ''));
  const reasonText = getJobAlertReasonText(alertReason, companyName);
  const safeReasonText = escapeHtml(reasonText);

  const subject = `${companyName || 'A company'} just posted a job: ${jobTitle || 'New job'}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;background:linear-gradient(135deg,#0b1f3b,#2563eb);color:#ffffff;">
                <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">SiteCrew</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">New job alert</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
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
                    View job on SiteCrew
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
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    subject,
    '',
    `Hi ${workerName || 'there'},`,
    '',
    `${companyName || 'A company'} just posted a job "${jobTitle || 'New job'}".`,
    '',
    reasonText,
    '',
    `View job: ${jobUrl}`,
    `Visit SiteCrew: ${env.publicUrl.replace(/\/$/, '')}`,
  ].join('\n');

  await getTransporter().sendMail({
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
};
