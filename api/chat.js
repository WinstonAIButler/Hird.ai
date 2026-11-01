// Hird agent chat. Each agent has a persona and a set of Claude Agent Skills
// (decks, spreadsheets, documents, PDFs) that run in Anthropic's code-execution container.
// Requires ANTHROPIC_API_KEY. Optional: HIRD_MODEL, HIRD_SKILLS=off, HIRD_CUSTOM_SKILLS, HIRD_FILE_SECRET.

import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, SHARED, customSkillsFor } from "./_agents.js";
import { signFileId } from "./_sign.js";

const MODEL = process.env.HIRD_MODEL || "claude-opus-5-5";
const SKILLS_ON = (process.env.HIRD_SKILLS || "on").toLowerCase() !== "off";
const MAX_SKILLS = 8;
const MAX_CONTINUES = 4;

let client;
function getClient() {
  if (!client) client = new Anthropic({ timeout: 110_000, maxRetries: 1 });
  return client;
}

function clean(messages) {
  if (!Array.isArray(messages)) return null;
  const out = [];
  for (const m of messages.slice(-14)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    out.push({ role: m.role, content: m.content.slice(0, 1200) });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out.length && out[out.length - 1].role === "user" ? out : null;
}

function skillsFor(agentId) {
  if (!SKILLS_ON) return [];
  const builtIn = AGENTS[agentId].skills.map((id) => ({ type: "anthropic", skill_id: id, version: "latest" }));
  const custom = customSkillsFor(agentId).map((id) => ({ type: "custom", skill_id: id, version: "latest" }));
  return [...builtIn, ...custom].slice(0, MAX_SKILLS);
}

// Code-execution results reference created files by file_id; collect them from anywhere in the content.
function collectFileIds(node, found) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => collectFileIds(n, found)); return; }
  if (typeof node.file_id === "string" && node.type !== "document" && node.type !== "image") found.add(node.file_id);
  for (const value of Object.values(node)) collectFileIds(value, found);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "The team is setting up. Chat goes live as soon as the site's AI key is added." });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  const agentId = body && typeof body.agent === "string" ? body.agent : "";
  const agent = Object.hasOwn(AGENTS, agentId) ? AGENTS[agentId] : null;
  const messages = body && clean(body.messages);
  if (!agent || !messages) return res.status(400).json({ error: "That message couldn't be read. Try sending it again." });

  const skills = skillsFor(agentId);
  const params = {
    model: MODEL,
    max_tokens: 16000,
    system: agent.persona + "\n\n" + SHARED,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01", ...(skills.length ? ["code-execution-2025-08-25"] : [])],
    fallbacks: "default",
    messages: [...messages]
  };
  if (skills.length) {
    params.container = { skills };
    params.tools = [{ type: "code_execution_20260521", name: "code_execution" }];
  }

  const anthropic = getClient();
  const texts = [];
  const fileIds = new Set();
  try {
    let response;
    for (let i = 0; i <= MAX_CONTINUES; i++) {
      response = await anthropic.beta.messages.create(params);
      for (const block of response.content) if (block.type === "text") texts.push(block.text);
      collectFileIds(response.content, fileIds);
      if (response.stop_reason !== "pause_turn") break;
      // A long code-execution turn paused: send it back so the server continues in the same container.
      params.messages = [...params.messages, { role: "assistant", content: response.content }];
      if (response.container?.id) params.container = { ...params.container, id: response.container.id };
    }

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "I can't help with that one, but I'm happy to dig into anything else about running your business." });
    }

    const files = [];
    for (const id of fileIds) {
      try {
        const meta = await anthropic.files.retrieveMetadata(id);
        if (meta.downloadable === false) continue;
        files.push({ name: meta.filename, url: "/api/file?f=" + encodeURIComponent(signFileId(id)) });
      } catch (e) {
        console.error("file metadata failed", id, e?.status || e?.message);
      }
    }

    const reply = texts.join("\n").trim() || (files.length ? "Here you go." : "Sorry, I lost my train of thought. Could you say that again?");
    return res.status(200).json({ reply, files });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("anthropic auth error: check ANTHROPIC_API_KEY", e.status);
      return res.status(503).json({ error: "The team is setting up. Chat goes live as soon as the site's AI key is fixed." });
    }
    if (e instanceof Anthropic.RateLimitError) {
      console.error("anthropic rate limited", e.status);
      return res.status(429).json({ error: "Lots of people are chatting right now. Try again in a minute." });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic error", e.status, e.message);
    } else {
      console.error(e);
    }
    return res.status(502).json({ error: "They're stepping out for a second. Try again in a moment." });
  }
}
