const { TRADE_LANDINGS } = require('./seoLandings');

const WORKING_DAYS_PER_YEAR = 220;

function formatGbp(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function tradeJobsPath(tradeName = '') {
  const name = String(tradeName).trim().toLowerCase();
  if (!name) return '/jobs';

  if (name === 'general labourer' || name === 'labourer') {
    return '/jobs/labourer';
  }

  const landing = Object.entries(TRADE_LANDINGS).find(([, item]) => {
    const label = String(item.label || '').toLowerCase();
    const filter = String(item.filter || '').toLowerCase();
    return label === name || filter === name;
  });

  if (landing) {
    return `/jobs/${landing[0]}`;
  }

  return `/jobs?trade=${encodeURIComponent(tradeName)}`;
}

function mapPublicSalaryCard(row) {
  const dayRate = row.day_rate != null ? Number(row.day_rate) : null;
  const hourlyRate = row.hourly_rate != null ? Number(row.hourly_rate) : null;
  const annualEstimate = dayRate != null ? dayRate * WORKING_DAYS_PER_YEAR : null;

  return {
    trade: row.trade_name,
    dayRate,
    hourlyRate,
    dayRateLabel: dayRate != null ? formatGbp(dayRate) : null,
    hourlyRateLabel: hourlyRate != null ? formatGbp(hourlyRate) : null,
    annualEstimate,
    annualEstimateLabel: annualEstimate != null ? formatGbp(annualEstimate) : null,
    jobsPath: tradeJobsPath(row.trade_name),
    sourceLabel: row.source_label || 'SiteCrew market average',
  };
}

module.exports = {
  WORKING_DAYS_PER_YEAR,
  formatGbp,
  tradeJobsPath,
  mapPublicSalaryCard,
};
