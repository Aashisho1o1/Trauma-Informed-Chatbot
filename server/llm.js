const { buildSystemPrompt } = require('./prompts');

const PROVIDER = process.env.LLM_PROVIDER || 'openai';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const REVIEW_MODEL = process.env.OPENAI_REVIEW_MODEL || 'gpt-4o-mini';
const MAX_CONTEXT_MESSAGES = 10;

let openaiClient = null;
let OpenAIClientConstructor = null;

function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function isLlmAvailable() {
  return PROVIDER === 'openai' && hasApiKey();
}

function getClient() {
  if (PROVIDER !== 'openai') {
    throw new Error(`Unsupported LLM provider: ${PROVIDER}`);
  }

  if (!hasApiKey()) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  if (!OpenAIClientConstructor) {
    // Lazy-load so deterministic guardrail evaluation can run without provider packages.
    OpenAIClientConstructor = require('openai');
  }

  if (!openaiClient) {
    openaiClient = new OpenAIClientConstructor({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

function sanitizeConversationHistory(conversationHistory) {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  return conversationHistory
    .filter((message) => {
      if (!message || typeof message !== 'object') {
        return false;
      }

      const validRole = message.role === 'user' || message.role === 'assistant';
      const validContent = typeof message.content === 'string' && message.content.trim().length > 0;
      return validRole && validContent;
    })
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 2000)
    }));
}

async function generateResponse(userMessage, conversationHistory = [], options = {}) {
  const language = options.language === 'es' ? 'es' : 'en';
  const mode = ['report', 'support', 'talk'].includes(options.mode) ? options.mode : 'talk';

  if (!isLlmAvailable()) {
    return null;
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt({ language, mode }) },
    ...sanitizeConversationHistory(conversationHistory),
    { role: 'user', content: userMessage }
  ];

  const completion = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 320
  });

  return completion?.choices?.[0]?.message?.content?.trim() || '';
}

async function runJsonReview({ prompt, maxTokens = 350 }) {
  if (!isLlmAvailable()) {
    return null;
  }

  const completion = await getClient().chat.completions.create({
    model: REVIEW_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a strict safety classifier. Return valid JSON only. Do not include markdown.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' }
  });

  const raw = completion?.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function getLlmMetadata() {
  return {
    provider: PROVIDER,
    chatModel: CHAT_MODEL,
    reviewModel: REVIEW_MODEL,
    keyConfigured: hasApiKey()
  };
}

module.exports = {
  CHAT_MODEL,
  REVIEW_MODEL,
  generateResponse,
  runJsonReview,
  sanitizeConversationHistory,
  isLlmAvailable,
  getLlmMetadata
};
