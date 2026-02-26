const CRISIS_RESPONSES = {
  en: {
    self_harm: `I hear you, and I am concerned about your safety. You matter, and support is available right now.\n\n- Call or text 988 (Suicide and Crisis Lifeline)\n- Crisis Text Line: text HOME to 741741\n- National Domestic Violence Hotline: 1-800-799-7233\n\nIf you are in immediate physical danger, call 911 now.`,
    immediate_danger: `Your safety is the top priority right now.\n\n- If you are in immediate physical danger, call 911\n- National Domestic Violence Hotline: 1-800-799-7233\n- Text START to 88788\n\nIf speaking out loud is unsafe, use the hotline's web chat when possible.`,
    acute_distress: `It sounds like this moment is very intense. You are not alone.\n\nTry one grounding step now: inhale for 4, hold for 4, exhale for 4.\n\nIf you want immediate human support:\n- Crisis Text Line: text HOME to 741741\n- National Domestic Violence Hotline: 1-800-799-7233`
  },
  es: {
    self_harm: `Te escucho y me preocupa tu seguridad. Tu vida importa y hay ayuda disponible ahora mismo.\n\n- Llama o envia mensaje al 988\n- Crisis Text Line: envia HOME al 741741\n- National Domestic Violence Hotline: 1-800-799-7233\n\nSi hay peligro fisico inmediato, llama al 911 ahora.`,
    immediate_danger: `Tu seguridad es la prioridad ahora mismo.\n\n- Si hay peligro fisico inmediato, llama al 911\n- National Domestic Violence Hotline: 1-800-799-7233\n- Envia START al 88788\n\nSi no puedes hablar, usa el chat web de la linea cuando sea posible.`,
    acute_distress: `Parece que este momento es muy dificil. No estas sola o solo.\n\nPrueba un paso de respiracion: inhala 4, sostiene 4, exhala 4.\n\nSi quieres apoyo humano inmediato:\n- Crisis Text Line: envia HOME al 741741\n- National Domestic Violence Hotline: 1-800-799-7233`
  }
};

const SERVER_FALLBACK_RESPONSE = {
  en: "I am having a little trouble right now, but I am still here with you. If you need urgent support, call 911 or the National Domestic Violence Hotline at 1-800-799-7233.",
  es: 'Estoy teniendo un problema tecnico en este momento, pero sigo aqui contigo. Si necesitas ayuda urgente, llama al 911 o a la linea nacional contra la violencia domestica al 1-800-799-7233.'
};

const NO_KEY_RESPONSE = {
  en: "I can still offer support, but advanced chat is temporarily unavailable. If you are in danger now, call 911. You can also contact the National Domestic Violence Hotline at 1-800-799-7233.",
  es: 'Aun puedo ofrecer apoyo, pero el chat avanzado esta temporalmente no disponible. Si hay peligro ahora, llama al 911. Tambien puedes contactar la linea nacional contra la violencia domestica al 1-800-799-7233.'
};

function normalizeLanguage(language) {
  return language === 'es' ? 'es' : 'en';
}

function getCrisisResponse(crisisType, language = 'en') {
  const normalizedLanguage = normalizeLanguage(language);
  const type = ['immediate_danger', 'self_harm', 'acute_distress'].includes(crisisType)
    ? crisisType
    : 'acute_distress';

  return CRISIS_RESPONSES[normalizedLanguage][type];
}

function getServerFallbackResponse(language = 'en') {
  return SERVER_FALLBACK_RESPONSE[normalizeLanguage(language)];
}

function getNoKeyResponse(language = 'en') {
  return NO_KEY_RESPONSE[normalizeLanguage(language)];
}

module.exports = {
  getCrisisResponse,
  getServerFallbackResponse,
  getNoKeyResponse
};
