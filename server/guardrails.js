const { buildSafetyReviewPrompt } = require('./prompts');
const { runJsonReview, isLlmAvailable } = require('./llm');

const BLOCKED_PHRASES = [
  'you should confront',
  'you should talk to him',
  'you should talk to her',
  'couples counseling',
  'couples therapy',
  'marriage counseling',
  'it takes two',
  'both sides',
  'what were you wearing',
  "why didn't you leave",
  "why didn't you report",
  'you need to forgive',
  'forgiveness is powerful',
  'your family has a point',
  'could have been worse',
  'at least',
  'one-time thing',
  'just once',
  'people make mistakes when angry',
  'are you sure that',
  'maybe you misunderstood',
  'not that bad',
  "you're overreacting",
  'calm down'
];

const ADVICE_PATTERNS = [
  /you (should|need to|must|have to) (file|report|press charges|go to court|sue|get a lawyer)/i,
  /you (should|need to|must|have to) (talk|speak|sit down|message|text|contact) (to|with) (him|her|them|your partner|your abuser)/i,
  /send (one )?(calm )?message.*(he|she|him|her|them|your partner|your abuser)/i,
  /i (recommend|advise|prescribe|diagnose)/i,
  /(it sounds like you|you) (may )?have\s+(ptsd|depression|anxiety|bipolar|bpd)/i,
  /you should take\s+[a-z]/i,
  /take\s+\d+\s*(mg|pills|tablets|doses)/i,
  /you (have|suffer from|are experiencing)\s+(ptsd|depression|anxiety|bipolar|bpd)/i,
  /definitely file (for )?(a )?restraining order/i,
  /you must leave immediately/i
];

const CONFIDENTIALITY_PATTERNS = [
  /everything you share here is completely confidential/i,
  /will never be shared with anyone/i,
  /i guarantee this is fully private/i,
  /100% private/i,
  /guarantee nobody can ever access/i
];

const FALLBACK_RESPONSES = {
  en: [
    'I hear you, and what you are going through matters. Would you like to explore options together, or focus on how you are feeling right now?',
    'Thank you for sharing this. I want to be careful and supportive. Would it help to talk about what support feels most useful right now?',
    'Your experience matters, and you are not alone. Would you like practical resources, emotional support, or both?'
  ],
  es: [
    'Te escucho y lo que estas viviendo importa. Quieres explorar opciones juntas o juntos, o prefieres hablar de como te sientes ahora?',
    'Gracias por compartir esto. Quiero responder con cuidado y apoyo. Te ayudaria hablar del tipo de apoyo que necesitas ahora?',
    'Tu experiencia importa y no estas sola o solo. Quieres recursos practicos, apoyo emocional, o ambos?'
  ]
};

function normalizeLanguage(language) {
  return language === 'es' ? 'es' : 'en';
}

function getRandomFallback(language = 'en') {
  const normalizedLanguage = normalizeLanguage(language);
  const options = FALLBACK_RESPONSES[normalizedLanguage];
  return options[Math.floor(Math.random() * options.length)];
}

function runDeterministicChecks(llmResponse) {
  const responseText = typeof llmResponse === 'string' ? llmResponse : '';
  const lower = responseText.toLowerCase();

  for (const phrase of BLOCKED_PHRASES) {
    if (lower.includes(phrase)) {
      return { safe: false, reason: `blocked_phrase:${phrase}`, severity: 'high' };
    }
  }

  for (const pattern of ADVICE_PATTERNS) {
    if (pattern.test(responseText)) {
      return { safe: false, reason: `advice_pattern:${pattern}`, severity: 'high' };
    }
  }

  for (const pattern of CONFIDENTIALITY_PATTERNS) {
    if (pattern.test(responseText)) {
      return { safe: false, reason: `confidentiality_pattern:${pattern}`, severity: 'high' };
    }
  }

  return { safe: true, reason: 'passed_deterministic', severity: 'low' };
}

function normalizeSeverity(value) {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'medium';
}

async function llmSafetyCheck(userMessage, assistantResponse) {
  const prompt = buildSafetyReviewPrompt({ userMessage, assistantResponse });
  const reviewResult = await runJsonReview({ prompt, maxTokens: 250 });

  if (!reviewResult || typeof reviewResult.safe !== 'boolean') {
    return {
      safe: false,
      reason: 'llm_parse_failure',
      severity: 'medium'
    };
  }

  return {
    safe: reviewResult.safe,
    reason: reviewResult.reason || (reviewResult.safe ? 'passed' : 'failed'),
    severity: normalizeSeverity(reviewResult.severity)
  };
}

async function checkGuardrails(userMessage, llmResponse, options = {}) {
  const language = normalizeLanguage(options.language);
  const useLlmCheck = options.useLlmCheck !== false;

  const deterministicResult = runDeterministicChecks(llmResponse);
  if (!deterministicResult.safe) {
    return {
      safe: false,
      reason: deterministicResult.reason,
      severity: deterministicResult.severity,
      fallback_response: getRandomFallback(language),
      check_mode: 'deterministic'
    };
  }

  if (!useLlmCheck) {
    return {
      safe: true,
      reason: deterministicResult.reason,
      severity: deterministicResult.severity,
      check_mode: 'deterministic'
    };
  }

  if (!isLlmAvailable()) {
    return {
      safe: true,
      reason: 'llm_unavailable_deterministic_only',
      severity: 'low',
      check_mode: 'deterministic_only'
    };
  }

  const llmResult = await llmSafetyCheck(userMessage, llmResponse);
  if (!llmResult.safe) {
    return {
      safe: false,
      reason: `llm_safety:${llmResult.reason}`,
      severity: llmResult.severity,
      fallback_response: getRandomFallback(language),
      check_mode: 'deterministic_plus_llm'
    };
  }

  return {
    safe: true,
    reason: 'passed_all_checks',
    severity: 'low',
    check_mode: 'deterministic_plus_llm'
  };
}

module.exports = {
  checkGuardrails,
  runDeterministicChecks,
  BLOCKED_PHRASES,
  ADVICE_PATTERNS
};
