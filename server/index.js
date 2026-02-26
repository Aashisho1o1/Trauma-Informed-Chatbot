require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { generateResponse, sanitizeConversationHistory, isLlmAvailable, getLlmMetadata } = require('./llm');
const { detectCrisis } = require('./crisis');
const { checkGuardrails } = require('./guardrails');
const { getCrisisResponse, getServerFallbackResponse, getNoKeyResponse } = require('./responses');

const app = express();
const PORT = Number(process.env.PORT || 3001);

const ALLOWED_MODES = new Set(['report', 'support', 'talk']);
const ALLOWED_LANGUAGES = new Set(['en', 'es']);

const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS policy'));
    }
  })
);

app.use(express.json({ limit: '20kb' }));

function normalizeLanguage(language) {
  return ALLOWED_LANGUAGES.has(language) ? language : 'en';
}

function validateChatPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  if (typeof payload.message !== 'string' || payload.message.trim().length === 0) {
    return { valid: false, error: 'message is required' };
  }

  if (payload.message.length > 2000) {
    return { valid: false, error: 'message exceeds max length of 2000 characters' };
  }

  if (!ALLOWED_MODES.has(payload.mode)) {
    return { valid: false, error: 'mode must be one of: report, support, talk' };
  }

  if (!ALLOWED_LANGUAGES.has(payload.language)) {
    return { valid: false, error: 'language must be one of: en, es' };
  }

  return { valid: true };
}

app.get('/api/health', (req, res) => {
  const metadata = getLlmMetadata();

  res.json({
    status: 'ok',
    uptime_seconds: Math.round(process.uptime()),
    llm_ready: isLlmAvailable(),
    provider: metadata.provider,
    models: {
      chat: metadata.chatModel,
      review: metadata.reviewModel
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const payloadValidation = validateChatPayload(req.body);
    if (!payloadValidation.valid) {
      res.status(400).json({
        response: getServerFallbackResponse('en'),
        is_crisis: false,
        error: payloadValidation.error
      });
      return;
    }

    const { message, mode, conversationHistory } = req.body;
    const language = normalizeLanguage(req.body.language);
    const safeHistory = sanitizeConversationHistory(conversationHistory);
    const llmMetadata = getLlmMetadata();

    const crisisCheck = await detectCrisis(message, { language, useLlmCheck: true });
    if (crisisCheck.is_crisis) {
      res.json({
        response: getCrisisResponse(crisisCheck.crisis_type, language),
        is_crisis: true,
        crisis_type: crisisCheck.crisis_type,
        meta: {
          provider: llmMetadata.provider,
          model: llmMetadata.chatModel,
          fallback_used: true
        }
      });
      return;
    }

    if (!isLlmAvailable()) {
      res.json({
        response: getNoKeyResponse(language),
        is_crisis: false,
        meta: {
          provider: llmMetadata.provider,
          model: llmMetadata.chatModel,
          fallback_used: true
        }
      });
      return;
    }

    const llmResponse = await generateResponse(message, safeHistory, { language, mode });

    if (!llmResponse) {
      throw new Error('Empty LLM response');
    }

    const guardrailResult = await checkGuardrails(message, llmResponse, {
      language,
      useLlmCheck: true
    });

    if (!guardrailResult.safe) {
      res.json({
        response: guardrailResult.fallback_response,
        is_crisis: false,
        guardrail_triggered: true,
        meta: {
          provider: llmMetadata.provider,
          model: llmMetadata.chatModel,
          fallback_used: true
        }
      });
      return;
    }

    res.json({
      response: llmResponse,
      is_crisis: false,
      meta: {
        provider: llmMetadata.provider,
        model: llmMetadata.chatModel,
        fallback_used: false
      }
    });
  } catch (error) {
    const language = normalizeLanguage(req.body?.language);

    res.json({
      response: getServerFallbackResponse(language),
      is_crisis: false,
      meta: {
        provider: getLlmMetadata().provider,
        model: getLlmMetadata().chatModel,
        fallback_used: true
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
