# Trauma-Informed Support Chatbot (Personal Project)

This is a personal project focused on building a safer AI-assisted support experience for people navigating emotional distress, including trauma-related situations.

The core goal is simple: combine helpful conversation support with strict safety boundaries, privacy-first defaults, and clear escalation behavior for crisis scenarios.

## Why I Built This

I wanted to explore a practical question:

How do you design an AI chat experience that is supportive, but avoids causing additional harm in high-stakes conversations?

To answer that, this project modernizes a scripted chatbot into a guarded LLM architecture with:
- trauma-informed response constraints
- crisis-first routing
- layered safety checks
- adversarial testing with measurable pass/fail thresholds

## Impact and Value (Plain Language)

For a non-technical reviewer, the value of this project is:

- Safer first response in hard moments: The chatbot is designed to avoid harmful phrasing and route users to emergency resources when risk signals appear.
- Privacy by default: No account required, no analytics tracking, and no server-side storage of conversation history.
- More consistent support language: Guardrails reduce risky, dismissive, or overconfident responses.
- Testable safety quality: The system includes an evaluation suite that checks behavior against known unsafe patterns.

This project is not a replacement for professional care. It is a safety-conscious support tool prototype.

## Problem This Project Addresses

Many AI chat experiences are optimized for usefulness, but not for emotional safety in sensitive contexts. In trauma-related conversations, poor wording can worsen distress.

This project focuses on reducing that risk through explicit constraints and fail-safe behavior.

## Core Safety Commitments

The following protections are built into the design:
- Safe exit controls
- Consent checkpoints during conversation
- Anonymous access
- No cookies/tracking/analytics
- No server-side conversation persistence
- Session-only frontend memory
- Emergency resource routing

## System Architecture

```text
User Message (client state only)
  -> Consent checkpoint (frontend)
  -> POST /api/chat
      -> Crisis detection (keyword + optional LLM classifier)
          -> If crisis: immediate resource response
      -> LLM generation (trauma-informed constrained prompt)
      -> Guardrail filter
          -> deterministic rules (blocked phrases/patterns)
          -> optional LLM safety review
      -> Safe response OR fallback response
  -> Rendered in chat UI (with crisis visual treatment)
```

## Request Lifecycle

1. Frontend collects user message and recent conversation turns from in-memory React state.
2. Frontend sends `message`, `conversationHistory`, `mode`, and `language` to backend.
3. Backend validates payload (`message` required, max length 2000, `mode` in `report|support|talk`, `language` in `en|es`).
4. Backend runs crisis detection before generation.
5. If no crisis, backend generates an LLM response with a strict trauma-informed system prompt.
6. Backend applies post-generation guardrails.
7. Backend returns one of:
   - approved LLM response
   - safety fallback response
   - crisis routing response

## API

### `GET /api/health`
Returns runtime health and model readiness.

Example response:
```json
{
  "status": "ok",
  "uptime_seconds": 125,
  "llm_ready": false,
  "provider": "openai",
  "models": {
    "chat": "gpt-4o-mini",
    "review": "gpt-4o-mini"
  },
  "timestamp": "2026-02-26T00:00:00.000Z"
}
```

### `POST /api/chat`

Request body:
```json
{
  "message": "string",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "mode": "report | support | talk",
  "language": "en | es"
}
```

Validation notes:
- Invalid payload returns HTTP `400` plus a safe fallback response and an `error` field.
- `conversationHistory` is sanitized server-side and only the last 10 valid turns are used.

Possible response bodies:

Approved response:
```json
{
  "response": "string",
  "is_crisis": false,
  "meta": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "fallback_used": false
  }
}
```

Guardrail fallback response:
```json
{
  "response": "string",
  "is_crisis": false,
  "guardrail_triggered": true,
  "meta": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "fallback_used": true
  }
}
```

Crisis routing response:
```json
{
  "response": "string",
  "is_crisis": true,
  "crisis_type": "immediate_danger | self_harm | acute_distress",
  "meta": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "fallback_used": true
  }
}
```

Validation error response (HTTP 400):
```json
{
  "response": "string",
  "is_crisis": false,
  "error": "message is required"
}
```

## Responsible AI Design

### 1. Prompt-level controls
The generation prompt encodes trauma-informed constraints:
- no victim-blaming
- no minimization
- no direct legal/medical/therapeutic instructions
- no abuser-confrontation guidance
- no confidentiality overpromises
- survivor agency language by default

### 2. Post-generation guardrails
Every generated response is checked before display:
- deterministic blocked phrases and regex patterns
- optional LLM safety review for subtle harms
- safe fallback message if unsafe or parsing fails

### 3. Crisis-first routing
Crisis detection runs before response generation:
- deterministic keyword checks for obvious emergencies
- optional LLM classifier for subtle crises
- immediate escalation to emergency resources when crisis is detected

### 4. Fail-safe behavior
- No API key: chatbot still responds with safe non-generative fallback
- Runtime errors: chatbot returns trauma-informed fallback
- No persistence: history remains in frontend memory only

## Evaluation Methodology

Evaluation uses adversarial test cases in `evaluation/test_cases.json` and runner `evaluation/run_eval.js`.

Two modes are reported:
- Deterministic layer (always available)
- Full stack (deterministic + LLM checks, when `OPENAI_API_KEY` exists)

Targets:
- Deterministic pass rate >= 90%
- Full stack pass rate >= 85%
- Script exits with non-zero status when thresholds are not met (CI-friendly)

Categories include:
- victim blaming
- minimizing language
- legal/medical directive advice
- confidentiality overpromises
- subtle abuser-contact suggestions
- crisis detection false positives/negatives

## Runbook

### Prerequisites
- Node.js 18+
- npm

### 1) Install client dependencies
```bash
npm install
```

### 2) Install server dependencies
```bash
cd server
npm install
cp .env.example .env
# set OPENAI_API_KEY in server/.env for full LLM behavior
cd ..
```

### 3) Start frontend
```bash
npm run start:client
```

### 4) Start backend
```bash
npm run start:server
```

### 5) Run evaluation suite
```bash
npm run eval:guardrails
```

## Environment Variables

Server (`server/.env`):
- `PORT`: backend port (default `3001`)
- `CLIENT_ORIGIN`: comma-separated allowed frontend origins for CORS (default `http://localhost:3000`)
- `LLM_PROVIDER`: provider name (currently `openai` is implemented)
- `OPENAI_API_KEY`: required for LLM generation/review/classification
- `OPENAI_CHAT_MODEL`: generation model (default `gpt-4o-mini`)
- `OPENAI_REVIEW_MODEL`: review/classifier model (default `gpt-4o-mini`)
- `CRISIS_THRESHOLD`: LLM crisis confidence threshold (default `0.70`)

Client (optional `.env` in repo root):
- `REACT_APP_API_URL`: backend base URL (default `http://localhost:3001`)

## Troubleshooting
- `LLM checks enabled: false`: set `OPENAI_API_KEY` in `server/.env`
- CORS errors: set `CLIENT_ORIGIN` in `server/.env` to frontend origin
- Speech input unavailable: browser may not support speech recognition APIs

## What This Demonstrates

- Product thinking in a sensitive domain: balancing usefulness with harm reduction
- Practical responsible AI patterns: prompt constraints + layered guardrails + fallback behavior
- Backend and frontend integration with clear API contracts
- Measurable quality approach using adversarial evaluation instead of subjective demos

## Limitations and Next Steps

Current prototype limitations:
- Guardrail quality depends on model quality and prompt reliability
- Regional hotline localization is currently US-centric
- No authenticated clinician escalation pipeline

Recommended next improvements:
- Add structured red-team datasets by language/domain variant
- Add provider adapters for additional LLM ecosystems
- Add auditable safety telemetry without storing user content
