// Serves a file an agent created in chat. Only accepts links signed by /api/chat.

import Anthropic from "@anthropic-ai/sdk";
import { verifyFileToken } from "./_sign.js";

let client;
function getClient() {
  if (!client) client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Use GET.");
  }
  const fileId = verifyFileToken(req.query?.f);
  if (!fileId) return res.status(404).send("That file link isn't valid.");

  try {
    const anthropic = getClient();
    const meta = await anthropic.files.retrieveMetadata(fileId);
    const download = await anthropic.files.download(fileId);
    const data = Buffer.from(await download.arrayBuffer());
    const safeName = (meta.filename || "hird-file").replace(/[^\w.\- ]+/g, "_");
    res.setHeader("Content-Type", meta.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(data);
  } catch (e) {
    if (e instanceof Anthropic.NotFoundError) return res.status(404).send("That file has expired.");
    console.error("file download failed", e?.status || e?.message);
    return res.status(502).send("The file couldn't be fetched. Try again in a moment.");
  }
}
