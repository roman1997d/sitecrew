const TRADE_SYNONYM_GROUPS = [
  ['dryliner', 'drylining', 'dry liner', 'dry lining', 'partition fixer', 'partitioning'],
  ['plasterer', 'plastering', 'skim', 'skimmer', 'renderer', 'rendering'],
  ['carpenter', 'carpentry', 'chippy', 'joiner', 'joinery', '1st fix', '2nd fix'],
  ['electrician', 'electrical', 'spark', 'sparky', 'ecs', 'mate electrician'],
  ['plumber', 'plumbing', 'pipefitter', 'pipe fitter', 'mechanical'],
  ['bricklayer', 'bricklaying', 'bricky', 'mason', 'masonry'],
  ['roofer', 'roofing', 'flat roofer', 'slater', 'tiler roofer'],
  ['groundworker', 'groundworks', 'civil', 'civils', 'drainage', 'kerbing'],
  ['painter', 'painting', 'decorator', 'decorating', 'painter decorator'],
  ['flooring', 'floor layer', 'floorlayer', 'vinyl', 'carpet fitter', 'tiler'],
  ['forklift driver', 'fork lift driver', 'flt driver', 'telehandler', 'plant operator', 'machine operator'],
  ['site security', 'security guard', 'gate man', 'gateman', 'traffic marshal', 'banksman'],
  ['labourer', 'laborer', 'general operative', 'site operative', 'operative'],
  ['site manager', 'manager assistant', 'assistant manager', 'supervisor', 'foreman'],
];

const DEFAULT_TRADE_MATCH_MIN_SCORE = 45;

function normalizeSearchValue(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(a = '', b = '') {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function fuzzyScore(query, values = []) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return 0;

  return values.reduce((bestScore, value) => {
    const normalizedValue = normalizeSearchValue(value);
    if (!normalizedValue) return bestScore;
    if (normalizedValue === normalizedQuery) return Math.max(bestScore, 100);
    if (normalizedValue.startsWith(normalizedQuery)) return Math.max(bestScore, 88);
    if (normalizedValue.includes(normalizedQuery)) return Math.max(bestScore, 74);

    const tokens = normalizedValue.split(' ');
    const tokenScore = tokens.reduce((bestTokenScore, token) => {
      const distance = levenshteinDistance(normalizedQuery, token);
      const maxLength = Math.max(normalizedQuery.length, token.length);
      const similarity = maxLength ? 1 - distance / maxLength : 0;
      return Math.max(bestTokenScore, similarity >= 0.72 ? Math.round(similarity * 64) : 0);
    }, 0);

    return Math.max(bestScore, tokenScore);
  }, 0);
}

function expandTradeTerms(trade = '') {
  const normalizedTrade = normalizeSearchValue(trade);
  if (!normalizedTrade) return [];

  const terms = new Set([normalizedTrade]);
  TRADE_SYNONYM_GROUPS.forEach((group) => {
    if (group.some((term) => {
      const normalizedTerm = normalizeSearchValue(term);
      return normalizedTerm === normalizedTrade
        || normalizedTerm.includes(normalizedTrade)
        || normalizedTrade.includes(normalizedTerm);
    })) {
      group.forEach((term) => terms.add(normalizeSearchValue(term)));
    }
  });

  return Array.from(terms);
}

function parseSearchList(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTradeInterestTerms(tradeInterests = []) {
  if (!Array.isArray(tradeInterests) || !tradeInterests.length) return [];
  return [...new Set(tradeInterests.flatMap((trade) => expandTradeTerms(trade)))];
}

function getJobTradeValues(job = {}) {
  return [
    job.trade_required,
    job.tradeRequired,
    job.title,
    job.description,
  ].filter(Boolean);
}

function scoreJobTradeMatch(job, tradeInterests = []) {
  const tradeTerms = buildTradeInterestTerms(tradeInterests);
  if (!tradeTerms.length) return 100;
  const jobValues = getJobTradeValues(job);
  if (!jobValues.length) return 0;
  return Math.max(...tradeTerms.map((term) => fuzzyScore(term, jobValues)), 0);
}

function jobMatchesTradeInterests(job, tradeInterests = [], minScore = DEFAULT_TRADE_MATCH_MIN_SCORE) {
  if (!Array.isArray(tradeInterests) || !tradeInterests.length) return true;
  return scoreJobTradeMatch(job, tradeInterests) >= minScore;
}

function filterJobsByTradeInterests(jobs = [], tradeInterests = [], minScore = DEFAULT_TRADE_MATCH_MIN_SCORE) {
  if (!Array.isArray(tradeInterests) || !tradeInterests.length) return [...jobs];
  return jobs
    .filter((job) => jobMatchesTradeInterests(job, tradeInterests, minScore))
    .sort((a, b) => scoreJobTradeMatch(b, tradeInterests) - scoreJobTradeMatch(a, tradeInterests));
}

function scoreCompanySearch(company, filters) {
  const companyScore = filters.companyName
    ? fuzzyScore(filters.companyName, [company.company_name])
    : 0;
  const locationScore = filters.location
    ? fuzzyScore(filters.location, [
      company.city,
      company.postcode,
      company.head_office,
      ...(company.open_job_cities || []),
      ...(company.open_job_postcodes || []),
    ])
    : 0;
  const tradeTerms = filters.tradeTerms || [];
  const tradeValues = [
    ...(company.trades || []),
    ...(company.open_job_trades || []),
    ...(company.open_job_titles || []),
  ];
  const tradeScore = filters.tradeTerms.length
    ? Math.max(...tradeTerms.map((term) => fuzzyScore(term, tradeValues)))
    : 0;

  const matchesCompany = !filters.companyName || companyScore >= DEFAULT_TRADE_MATCH_MIN_SCORE;
  const matchesLocation = !filters.location || locationScore >= DEFAULT_TRADE_MATCH_MIN_SCORE;
  const matchesTrade = !filters.tradeTerms.length || tradeScore >= DEFAULT_TRADE_MATCH_MIN_SCORE;

  return {
    matches: matchesCompany && matchesLocation && matchesTrade,
    score: (tradeScore * 1.8) + (locationScore * 1.25) + (companyScore * 0.8) + (Number(company.open_job_count || 0) * 4),
    match: {
      companyName: companyScore,
      location: locationScore,
      trade: tradeScore,
    },
  };
}

function filterRelevantOpenJobs(company, filters) {
  const openJobs = Array.isArray(company.open_jobs) ? company.open_jobs : [];
  if (!filters.tradeTerms?.length) return openJobs;

  return openJobs
    .map((job) => {
      const score = Math.max(...filters.tradeTerms.map((term) => fuzzyScore(term, [
        job.tradeRequired,
        job.trade_required,
        job.title,
        job.description,
      ])));
      return { ...job, matchScore: score };
    })
    .filter((job) => job.matchScore >= DEFAULT_TRADE_MATCH_MIN_SCORE)
    .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  DEFAULT_TRADE_MATCH_MIN_SCORE,
  normalizeSearchValue,
  fuzzyScore,
  expandTradeTerms,
  parseSearchList,
  buildTradeInterestTerms,
  scoreJobTradeMatch,
  jobMatchesTradeInterests,
  filterJobsByTradeInterests,
  scoreCompanySearch,
  filterRelevantOpenJobs,
};
