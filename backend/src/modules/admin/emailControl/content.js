const env = require('../../../config/env');
const { siteUrl } = require('./recipients');

function formatJobLine(job) {
  const rate = job.rate ? ` · ${job.rate}` : '';
  const city = job.city ? ` · ${job.city}` : '';
  return `${job.title}${city}${rate}`;
}

function buildEmailContent(modeKey, recipient, context = {}) {
  const dashboardUrl = recipient.audience === 'company'
    ? siteUrl('/company/dashboard')
    : siteUrl('/worker/dashboard');

  const jobLines = (recipient.matchedJobs || context.matchedJobs || [])
    .slice(0, 5)
    .map(formatJobLine);

  switch (modeKey) {
    case 'interests':
      return {
        subject: 'New jobs matching your interests on SiteCrew',
        intro: 'We found open jobs that match your trade interests.',
        details: jobLines.length ? jobLines : ['Open SiteCrew to browse matching jobs.'],
        ctaLabel: 'View matching jobs',
        ctaUrl: dashboardUrl,
      };
    case 'location':
      return {
        subject: 'New jobs near your location on SiteCrew',
        intro: 'There are open jobs near the locations on your profile.',
        details: jobLines.length ? jobLines : ['Open SiteCrew to browse local jobs.'],
        ctaLabel: 'View local jobs',
        ctaUrl: dashboardUrl,
      };
    case 'interests-location':
      return {
        subject: 'Jobs matching your interests and location',
        intro: 'These open jobs match both your trade interests and location.',
        details: jobLines.length ? jobLines : ['Open SiteCrew to browse matched jobs.'],
        ctaLabel: 'View matched jobs',
        ctaUrl: dashboardUrl,
      };
    case 'job-prices-interests':
      return {
        subject: 'Today’s job rates matching your interests',
        intro: 'Here are current job prices/rates for roles matching your interests.',
        details: jobLines.length ? jobLines : ['No priced jobs matched today yet. Check SiteCrew for updates.'],
        ctaLabel: 'See job rates',
        ctaUrl: dashboardUrl,
      };
    case 'followed-company-jobs':
      return {
        subject: 'New jobs from companies you follow',
        intro: 'Companies you follow posted jobs you may want to review.',
        details: jobLines.length ? jobLines : ['Open SiteCrew to see followed companies.'],
        ctaLabel: 'View followed jobs',
        ctaUrl: dashboardUrl,
      };
    case 'company-contact':
      return {
        subject: context.subject || 'A company contacted you on SiteCrew',
        intro: context.intro || `${context.companyName || 'A company'} sent you a message.`,
        details: context.preview ? [context.preview] : [],
        ctaLabel: 'Open messages',
        ctaUrl: context.ctaUrl || dashboardUrl,
      };
    case 'company-worker-contact':
      return {
        subject: context.subject || 'A worker contacted your company',
        intro: context.intro || `${context.workerName || 'A worker'} sent your company a message.`,
        details: context.preview ? [context.preview] : [],
        ctaLabel: 'Open messages',
        ctaUrl: context.ctaUrl || dashboardUrl,
      };
    case 'unread-12h':
      return {
        subject: 'You have unreplied messages on SiteCrew',
        intro: 'You have company messages waiting for a reply for more than 12 hours.',
        details: ['Reply soon so companies know you are available.'],
        ctaLabel: 'Reply now',
        ctaUrl: recipient.ctaUrl || dashboardUrl,
      };
    case 'company-unread-12h':
      return {
        subject: 'Workers are waiting for your reply',
        intro: 'You have worker messages waiting for a reply for more than 12 hours.',
        details: ['Reply from your company dashboard to keep conversations moving.'],
        ctaLabel: 'Open messages',
        ctaUrl: recipient.ctaUrl || dashboardUrl,
      };
    case 'job-invite':
      return {
        subject: context.subject || 'You received a job invite on SiteCrew',
        intro: context.intro || `${context.companyName || 'A company'} invited you to a job.`,
        details: context.jobTitle ? [`Job: ${context.jobTitle}`] : [],
        ctaLabel: 'View job invite',
        ctaUrl: context.ctaUrl || (context.jobId ? siteUrl(`/jobs/${context.jobId}`) : dashboardUrl),
      };
    case 'application-status':
      return {
        subject: context.subject || 'Your application status was updated',
        intro: context.intro || `Your application status is now: ${context.status || 'updated'}.`,
        details: context.jobTitle ? [`Job: ${context.jobTitle}`] : [],
        ctaLabel: 'View application',
        ctaUrl: dashboardUrl,
      };
    case 'company-new-applications':
      return {
        subject: context.subject || 'New application on your job',
        intro: context.intro || 'A worker applied to one of your open jobs.',
        details: context.jobTitle ? [`Job: ${context.jobTitle}`] : [],
        ctaLabel: 'Review applicants',
        ctaUrl: dashboardUrl,
      };
    case 'company-application-withdrawn':
      return {
        subject: context.subject || 'An applicant withdrew',
        intro: context.intro || 'A worker withdrew their application from your job.',
        details: context.jobTitle ? [`Job: ${context.jobTitle}`] : [],
        ctaLabel: 'View applications',
        ctaUrl: dashboardUrl,
      };
    case 'verification-status':
      return {
        subject: 'Your SiteCrew verification was updated',
        intro: context.intro || `Your worker verification status is now: ${context.status || 'updated'}.`,
        details: [],
        ctaLabel: 'Open profile',
        ctaUrl: dashboardUrl,
      };
    case 'company-verification':
      return {
        subject: 'Your company verification was updated',
        intro: context.intro || `Your company verification status is now: ${context.status || 'updated'}.`,
        details: [],
        ctaLabel: 'Open company dashboard',
        ctaUrl: dashboardUrl,
      };
    case 'new-review':
      return {
        subject: 'You received a new review on SiteCrew',
        intro: context.intro || `${context.companyName || 'A company'} left a review on your profile.`,
        details: context.rating ? [`Rating: ${context.rating}/5`] : [],
        ctaLabel: 'View review',
        ctaUrl: dashboardUrl,
      };
    case 'profile-incomplete':
      return {
        subject: 'Complete your SiteCrew worker profile',
        intro: 'Your profile is missing details that help companies find you.',
        details: [
          'Add a profile photo',
          'Set your trade interests',
          'Add your city / work locations',
        ],
        ctaLabel: 'Complete profile',
        ctaUrl: recipient.ctaUrl || dashboardUrl,
      };
    case 'expected-rate-missing':
      return {
        subject: 'Add your expected rate on SiteCrew',
        intro: 'Workers with an expected rate appear better in company matching and rate digests.',
        details: ['Set your expected rate from your dashboard.'],
        ctaLabel: 'Set expected rate',
        ctaUrl: recipient.ctaUrl || dashboardUrl,
      };
    case 'availability-reminder':
      return {
        subject: 'Update your availability on SiteCrew',
        intro: `Your availability is still “${recipient.availabilityStatus || 'not Available Now'}”. Update it if things changed.`,
        details: ['Companies filter by current availability.'],
        ctaLabel: 'Update availability',
        ctaUrl: recipient.ctaUrl || dashboardUrl,
      };
    case 'company-plan-expiry':
      return {
        subject: 'Your SiteCrew plan is expiring soon',
        intro: 'Your company plan is approaching expiry. Renew to keep premium features active.',
        details: recipient.planExpiresAt
          ? [`Expiry date: ${new Date(recipient.planExpiresAt).toLocaleDateString('en-GB')}`]
          : [],
        ctaLabel: 'Manage plan',
        ctaUrl: recipient.ctaUrl || dashboardUrl,
      };
    case 'company-matched-workers':
      return {
        subject: 'Matched workers are available on SiteCrew',
        intro: 'There are workers matching your company trades and hiring needs.',
        details: ['Open Find Workers to review recommended profiles.'],
        ctaLabel: 'Find workers',
        ctaUrl: dashboardUrl,
      };
    case 'company-rates-digest':
      return {
        subject: 'Today’s worker rates & availability digest',
        intro: 'Check the latest worker rate and availability signals for your trades.',
        details: ['Open your company dashboard for the latest matching workers.'],
        ctaLabel: 'Open dashboard',
        ctaUrl: dashboardUrl,
      };
    default:
      return {
        subject: 'SiteCrew notification',
        intro: context.intro || 'You have a new notification from SiteCrew.',
        details: [],
        ctaLabel: 'Open SiteCrew',
        ctaUrl: env.publicUrl.replace(/\/$/, ''),
      };
  }
}

module.exports = {
  buildEmailContent,
};
