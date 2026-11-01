// GET/POST /api/jarvis: Jarvis, Hird.ai's operations chief of staff (page at /jarvis).
// Reads Stripe and GitHub (never writes) and has Claude write the briefing and answer questions.
// Environment variables (Vercel -> Settings -> Environment Variables):
//   JARVIS_ACCESS_CODE  optional; if set, the page asks for it (Jarvis is open without it)
//   ANTHROPIC_API_KEY   Claude, for briefings and questions
//   JARVIS_STRIPE_KEY   a restricted, read-only Stripe key (falls back to STRIPE_SECRET_KEY)
//   GITHUB_TOKEN        a fine-grained, read-only token for this repo
//   JARVIS_MODEL        optional, default claude-sonnet-5-5
import { companyConfig, handleJarvis } from "./_jarvis-core.js";

const COMPANY = {
  "id": "hird.ai",
  "name": "Hird.ai",
  "repo": "WinstonAIButler/hird.ai",
  "context": "Hird.ai sells an AI team for small businesses: nine named agent personas (Sarah, Chief of Staff; Mike, CTO; Jessica, Growth; David, Finance; Emily, Customer Support; Chris, Sales; Rachel, People & Hiring; Kevin, Legal & Contracts; Megan, Content & Social) that customers chat with on the site and that produce decks, spreadsheets, documents and PDFs. Growth depends on getting owners to try 'Talk to the team' and converting them."
};

export default async function handler(req, res) {
  const out = await handleJarvis(
    { method: req.method, headers: req.headers, body: req.body },
    companyConfig(process.env, COMPANY),
  );
  res.setHeader("Cache-Control", "no-store");
  res.status(out.status).json(out.body);
}
