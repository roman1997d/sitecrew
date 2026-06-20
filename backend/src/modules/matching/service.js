function scoreWorkerForJob(worker, job) {
  let score = 0;
  const reasons = [];

  if (worker.trades?.includes(job.trade_required)) {
    score += 45;
    reasons.push('trade match');
  }

  const certificateMatches = (job.certificates_required || []).filter((certificate) =>
    (worker.certificates || []).includes(certificate)
  );
  if (certificateMatches.length > 0) {
    score += Math.min(25, certificateMatches.length * 10);
    reasons.push('certificate match');
  }

  if (worker.city && job.city && worker.city.toLowerCase() === job.city.toLowerCase()) {
    score += 20;
    reasons.push('same city');
  }

  if ((worker.availability_status || '').toLowerCase().includes('available')) {
    score += 10;
    reasons.push('available');
  }

  return { score, reasons };
}

module.exports = { scoreWorkerForJob };
