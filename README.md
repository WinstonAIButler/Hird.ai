# Saga.ai

AI operating team and agent interactive system. This repo holds the marketing site.

Static landing page (`index.html`) plus one Vercel serverless function (`api/chat.js`) that powers "Talk to the team".

## Chat setup
Add `ANTHROPIC_API_KEY` in Vercel → Project → Settings → Environment Variables (Production and Preview), then redeploy.
Optional: `SAGA_MODEL` to override the model (default `claude-sonnet-5-5`).

Agents: Maya (Chief of Staff), Theo (CTO), Rio (Growth), June (Finance). Personas live in `api/chat.js`.
