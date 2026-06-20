const { runRuleEngine } = require('./ruleEngine');
const { runAiAnalysis } = require('./aiAnalysis');
const { mergeScores, calculateRisk } = require('./riskCalculator');

async function scanContent(input) {
  const ruleResult = runRuleEngine(input);
  const aiResult = await runAiAnalysis(input, ruleResult.scanText);
  const scores = mergeScores(ruleResult.scores, aiResult.scores);
  const risk = calculateRisk({
    contentType: input.contentType,
    scores,
    flags: ruleResult.flags,
    duplicateScore: ruleResult.duplicateScore,
    externalContactScore: ruleResult.externalContactScore,
    matches: ruleResult.matches,
  });

  return {
    ...risk,
    analysis: {
      rulesApplied: true,
      aiApplied: aiResult.applied,
      aiError: aiResult.error,
      matches: ruleResult.matches,
    },
  };
}

module.exports = { scanContent };
