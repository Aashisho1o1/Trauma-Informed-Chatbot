# Trauma-Informed Support Chatbot: IBM-Focused LLM Modernization

This prototype modernizes a trauma-informed support chatbot from scripted decision trees to a guarded LLM architecture for safety-critical use.

## Why This Version Exists

This version is designed to demonstrate IBM-relevant skills:
- Responsible AI implementation in a high-stakes domain
- Prompt engineering for constrained LLM behavior
- Multi-layer guardrail design
- Crisis intent detection and routing
- Adversarial evaluation with measurable pass/fail criteria

## Core Safety Commitments (Preserved)

The original non-negotiable protections remain intact:
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
  -> Consent checkpoint (frontend, existing)
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

1. Frontend collects user message and last conversation turns from in-memory React state.
2. Frontend sends `message`, `conversationHistory`, `mode`, and `language` to backend.
3. Backend runs crisis detection before generation.
4. If no crisis, backend generates LLM response with strict trauma-informed system prompt.
5. Backend applies post-generation guardrails.
6. Backend returns either:
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

Response body:
```json
{
  "response": "string",
  "is_crisis": false,
  "crisis_type": "immediate_danger | self_harm | acute_distress | none",
  "guardrail_triggered": false,
  "meta": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "fallback_used": false
  }
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

Categories include:
- victim blaming
- minimizing language
- legal/medical directive advice
- confidentiality overpromises
- subtle abuser-contact suggestions
- crisis detection false positives/negatives

## Runbook

## Prerequisites
- Node.js 18+
- npm

## 1) Install client dependencies
```bash
npm install
```

## 2) Install server dependencies
```bash
cd server
npm install
cp .env.example .env
# set OPENAI_API_KEY in server/.env for full LLM behavior
cd ..
```

## 3) Start frontend
```bash
npm run start:client
```

## 4) Start backend
```bash
npm run start:server
```

## 5) Run evaluation suite
```bash
npm run eval:guardrails
```

## Troubleshooting
- `LLM checks enabled: false`: set `OPENAI_API_KEY` in `server/.env`.
- CORS errors: set `CLIENT_ORIGIN` in `server/.env` to frontend origin.
- Speech input unavailable: browser may not support speech recognition APIs.

## IBM Interview Talking Points

- Built multi-layer safety controls: deterministic guardrails plus LLM safety review.
- Used hybrid crisis detection with low-latency keyword matching and classifier fallback.
- Encoded trauma-informed domain constraints directly into reusable prompt framework.
- Added adversarial evaluation harness with measurable thresholds and failure reporting.
- Prioritized fail-safe defaults and privacy-by-design (no server-side data retention).

## Limitations and Next Steps

Current prototype limitations:
- Guardrail quality depends on model quality and prompt reliability
- Regional hotline localization is US-centric
- No authenticated clinician escalation pipeline

Recommended next improvements:
- Add structured red-team datasets by language/domain variant
- Add provider adapter implementation for IBM watsonx
- Add auditable safety telemetry without storing user content
