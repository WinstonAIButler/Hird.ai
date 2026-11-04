# Hird.ai

Static landing page (`index.html`) plus Vercel serverless functions that power "Talk to the team":

- `api/chat.js` talks to Claude with each agent's persona and Agent Skills.
- `api/file.js` serves files an agent made (decks, spreadsheets, docs, PDFs). It only accepts signed links from `api/chat.js`.
- `overview/index.html` is the executive company overview, served at `/overview` (not indexed by search engines).
- `api/_agents.js` holds the nine personas and which skills each one gets. Files starting with `_` are not routes.

## Agents and skills
| Agent | Role | Built-in skills |
|---|---|---|
| Sarah | Chief of Staff | docx, pdf |
| Mike | CTO | xlsx, docx |
| Jessica | Growth | pptx, xlsx |
| David | Finance | xlsx, pdf |
| Emily | Customer Support | docx |
| Chris | Sales | pptx, docx |
| Rachel | People & Hiring | docx, pdf |
| Kevin | Legal & Contracts | docx, pdf |
| Megan | Content & Social | pptx, docx |

## Environment variables
- `ANTHROPIC_API_KEY` (required). Production, and Preview if you want chat on preview links.
- `HIRD_MODEL` (optional), default `claude-opus-5-5`.
- `HIRD_SKILLS=off` (optional) turns off file-making skills and code execution to cut cost. Chat still works.
- `HIRD_CUSTOM_SKILLS` (optional) adds your own skills after uploading them to your Anthropic workspace (Console → Skills, or `POST /v1/skills`). JSON mapping agent id, or `*` for everyone, to skill ids, for example `{"*":["skill_abc"],"jessica":["skill_def"]}`. Up to 8 skills per agent in total.
- `HIRD_FILE_SECRET` (optional) signs download links. Defaults to a key derived from the API key.

Skills claude.ai users create in their own account are not visible to the API. Upload the skill folder to the API workspace first, then list its id in `HIRD_CUSTOM_SKILLS`.

## Jarvis

`/jarvis` is Hird.ai's operations chief of staff: live Stripe revenue (balance, last 30 days, monthly recurring, open and overdue invoices), dev status from GitHub (open pull requests, latest deploys, recent commits), and a Claude-written briefing with today's priorities and sales and marketing moves. You can also ask it questions. It only reads: it can't move money, merge code or email anyone. It's not linked from the site and isn't indexed.

The page calls `api/jarvis.js`; the engine is `api/_jarvis-core.js`, an identical copy in every Joslin Enterprises repo, so change it there and copy it across. Set these in Vercel → Settings → Environment Variables, then redeploy:

- `JARVIS_ACCESS_CODE` (optional): leave it empty and Jarvis opens for anyone with the link; set it to require a passphrase.
- `ANTHROPIC_API_KEY`: Claude, for briefings and questions (the same key as Talk to the team).
- `JARVIS_STRIPE_KEY`: a restricted Stripe key with Read on Balance, Charges, Subscriptions and Invoices.
- `GITHUB_TOKEN`: a fine-grained token with read-only Contents, Pull requests and Deployments on this repo.
- `JARVIS_MODEL` (optional): default `claude-sonnet-5-5`.
