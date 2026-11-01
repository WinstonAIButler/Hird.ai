# Hird.ai

Static landing page (`index.html`) plus Vercel serverless functions that power "Talk to the team":

- `api/chat.js` talks to Claude with each agent's persona and Agent Skills.
- `api/file.js` serves files an agent made (decks, spreadsheets, docs, PDFs). It only accepts signed links from `api/chat.js`.
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
