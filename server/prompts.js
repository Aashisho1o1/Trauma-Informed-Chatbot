const TRAUMA_INFORMED_SYSTEM_PROMPT = `
You are a supportive, trauma-informed assistant for survivors of domestic violence,
harassment, and sexual assault.

NON-NEGOTIABLE RULES:
1. Survivor agency comes first. Never command the user. Prefer "some options include" and "you might consider".
2. Always validate and believe the user. Never question their account.
3. Never blame or minimize.
4. Never give medical, legal, or therapeutic diagnosis/treatment advice.
5. Never suggest confrontation with an abuser.
6. Never suggest couples counseling or mediation for abuse dynamics.
7. Never request personally identifying information.
8. Keep language plain, warm, and direct.
9. Use short-to-medium responses, usually 3-6 sentences.
10. End with a gentle, open invitation.

DO NOT CLAIM:
- confidentiality guarantees
- legal/medical certainty
- outcomes you cannot guarantee

When relevant, offer resources:
- National Domestic Violence Hotline: 1-800-799-7233, text START to 88788
- RAINN: 1-800-656-4673
- Crisis Text Line: text HOME to 741741
- Immediate danger: call 911
- Suicide and Crisis Lifeline: 988
`;

const MODE_GUIDANCE = {
  report: 'Conversation mode is report. Help the user share only what they choose, without pressure.',
  support: 'Conversation mode is support. Focus on emotional validation and resource navigation.',
  talk: 'Conversation mode is explore options. Provide choices and preserve user control.'
};

const LANGUAGE_GUIDANCE = {
  en: 'Respond in English.',
  es: 'Responde en espanol claro, sensible y sencillo.'
};

function buildSystemPrompt({ language = 'en', mode = 'talk' } = {}) {
  const normalizedLanguage = language === 'es' ? 'es' : 'en';
  const normalizedMode = Object.prototype.hasOwnProperty.call(MODE_GUIDANCE, mode) ? mode : 'talk';

  return [
    TRAUMA_INFORMED_SYSTEM_PROMPT.trim(),
    MODE_GUIDANCE[normalizedMode],
    LANGUAGE_GUIDANCE[normalizedLanguage]
  ].join('\n\n');
}

function buildCrisisDetectionPrompt({ userMessage, language = 'en', threshold = 0.7 }) {
  const normalizedLanguage = language === 'es' ? 'es' : 'en';

  return `
Analyze this survivor-support chat message for immediate crisis.

Classify as crisis when there is evidence of:
- immediate physical danger
- self-harm or suicide intent
- acute distress that may require urgent intervention

Return strict JSON with this schema only:
{
  "is_crisis": true or false,
  "crisis_type": "immediate_danger" | "self_harm" | "acute_distress" | "none",
  "confidence": number between 0 and 1,
  "reasoning": "short explanation"
}

Rules:
- If confidence >= ${threshold}, set is_crisis to true.
- If uncertain between true/false, prioritize safety.
- The user language is ${normalizedLanguage}; still return JSON keys in English.

User message:
"""${userMessage}"""
`;
}

function buildSafetyReviewPrompt({ userMessage, assistantResponse }) {
  return `
Review this assistant response for trauma-informed safety compliance.

Flag as unsafe if it does ANY of the following:
1. Gives specific medical/legal/therapeutic advice
2. Uses victim-blaming language
3. Minimizes abuse or trauma
4. Suggests contacting or confronting an abuser
5. Suggests couples/marriage counseling in abuse context
6. Promises confidentiality or guaranteed outcomes
7. Uses diagnosis language (example: "you have PTSD")
8. Is dismissive, judgmental, or condescending
9. Shares tactics that could help someone stalk, track, or harm another person

Return strict JSON only:
{
  "safe": true or false,
  "reason": "passed" or short reason,
  "severity": "low" | "medium" | "high"
}

User message:
"""${userMessage}"""

Assistant response:
"""${assistantResponse}"""
`;
}

module.exports = {
  buildSystemPrompt,
  buildCrisisDetectionPrompt,
  buildSafetyReviewPrompt,
  TRAUMA_INFORMED_SYSTEM_PROMPT
};
