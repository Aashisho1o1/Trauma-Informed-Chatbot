const { buildCrisisDetectionPrompt } = require('./prompts');
const { runJsonReview, isLlmAvailable } = require('./llm');

const CRISIS_THRESHOLD = Number(process.env.CRISIS_THRESHOLD || 0.7);

const CRISIS_KEYWORDS = [
  { term: 'kill myself', type: 'self_harm' },
  { term: 'end my life', type: 'self_harm' },
  { term: 'want to die', type: 'self_harm' },
  { term: 'suicide', type: 'self_harm' },
  { term: 'self-harm', type: 'self_harm' },
  { term: 'hurt myself', type: 'self_harm' },
  { term: 'end it all', type: 'self_harm' },
  { term: "he's here", type: 'immediate_danger' },
  { term: "she's here", type: 'immediate_danger' },
  { term: 'they are here right now', type: 'immediate_danger' },
  { term: "i'm not safe", type: 'immediate_danger' },
  { term: 'not safe', type: 'immediate_danger' },
  { term: 'in danger', type: 'immediate_danger' },
  { term: 'has a weapon', type: 'immediate_danger' },
  { term: 'has a gun', type: 'immediate_danger' },
  { term: 'has a knife', type: 'immediate_danger' },
  { term: 'threatening me right now', type: 'immediate_danger' },
  { term: 'locked in', type: 'immediate_danger' },
  { term: 'going to hurt me', type: 'immediate_danger' },
  { term: 'going to kill me', type: 'immediate_danger' }
];

function normalizeCrisisType(value) {
  if (value === 'immediate_danger' || value === 'self_harm' || value === 'acute_distress') {
    return value;
  }

  return 'none';
}

function keywordCrisisMatch(userMessage) {
  const lower = userMessage.toLowerCase();

  for (const keyword of CRISIS_KEYWORDS) {
    if (lower.includes(keyword.term)) {
      return {
        is_crisis: true,
        crisis_type: keyword.type,
        confidence: 0.95,
        reasoning: `keyword_match:${keyword.term}`
      };
    }
  }

  return null;
}

async function detectCrisis(userMessage, options = {}) {
  const language = options.language === 'es' ? 'es' : 'en';
  const useLlmCheck = options.useLlmCheck !== false;

  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return { is_crisis: false, crisis_type: 'none', confidence: 0, reasoning: 'empty_message' };
  }

  const keywordMatch = keywordCrisisMatch(userMessage);
  if (keywordMatch) {
    return keywordMatch;
  }

  if (!useLlmCheck || !isLlmAvailable()) {
    return { is_crisis: false, crisis_type: 'none', confidence: 0, reasoning: 'deterministic_no_match' };
  }

  try {
    const prompt = buildCrisisDetectionPrompt({
      userMessage,
      language,
      threshold: CRISIS_THRESHOLD
    });

    const reviewResult = await runJsonReview({ prompt, maxTokens: 250 });
    if (!reviewResult) {
      return { is_crisis: false, crisis_type: 'none', confidence: 0, reasoning: 'llm_parse_failure' };
    }

    const confidenceRaw = Number(reviewResult.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0;

    const crisisType = normalizeCrisisType(reviewResult.crisis_type);
    const isCrisis = Boolean(reviewResult.is_crisis) || confidence >= CRISIS_THRESHOLD;

    if (!isCrisis) {
      return {
        is_crisis: false,
        crisis_type: 'none',
        confidence,
        reasoning: reviewResult.reasoning || 'llm_no_crisis'
      };
    }

    return {
      is_crisis: true,
      crisis_type: crisisType === 'none' ? 'acute_distress' : crisisType,
      confidence,
      reasoning: reviewResult.reasoning || 'llm_detected_crisis'
    };
  } catch (error) {
    return { is_crisis: false, crisis_type: 'none', confidence: 0, reasoning: 'llm_error' };
  }
}

module.exports = {
  detectCrisis,
  CRISIS_KEYWORDS
};
