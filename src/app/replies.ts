// src/app/replies.ts
// -----------------------------------------------------------------------------
// Live version — connects ASSETBOT to your deployed Render backend.
// Fetches real inventory info instead of demo replies.
// -----------------------------------------------------------------------------

import fetch from "node-fetch";

// 🌐 Your deployed backend URL on Render
const BACKEND_URL =
  process.env.BACKEND_URL || "https://inventory-bot-api.onrender.com";
  console.log("🔗 Using backend:", BACKEND_URL);


// --- Interfaces for type safety ----------------------------------------------
interface BackendResponse {
  reply?: string;
  status?: string;
  location?: string;
}

// --- Helper to normalize input -----------------------------------------------
function normalizeInput(text: string): string {
  return (text || "")
    .replace(/\u00A0/g, " ") // non-breaking spaces → normal
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
    .toLowerCase();
}

// A loose asset-id matcher (PC-101, pc 101, printer_02, etc.)
const ASSET = /([a-z]{1,8}[- ]?\d{1,6}|[a-z0-9._-]+)/i;
const END = String.raw`[?.!"]*\s*$`;

// -----------------------------------------------------------------------------
// Return a reply string if handled here; otherwise undefined
// -----------------------------------------------------------------------------
export async function getPredefinedReply(
  text: string
): Promise<string | undefined> {
  const t = normalizeInput(text);

  // --- Local replies (kept simple) ------------------------------------------
  if (/^(hi|hello|hey|yo|hola)\b/.test(t)) {
    return (
      "Hi there! 👋 I’m ASSETBOT. Try:\n" +
      "• `who has PC-101?`\n" +
      "• `status of PC-102`\n" +
      "• `help` to see commands."
    );
  }

  if (/^(help|commands?|menu|\?)$/.test(t)) {
    return [
      "Here’s what I can do:",
      "• `who has <asset-id>` – shows current assignee",
      "• `status of <asset-id>` – shows location & condition",
      "• `where is <asset-id>` – quick location lookup",
      "• `assign <asset-id> to <netid>` – update the owner (admins only)",
      "• `unassign <asset-id>` – release the asset (admins only)",
      "• `delete <asset-id>` – archive/remove asset (admins only)"
    ].join("\n");
  }

  if (/^\s*ping\s*$/i.test(t)) return "pong";

  // --- Backend-powered inventory commands -----------------------------------
  try {
    // “who has PC-101?”
    const whoMatch = t.match(
      new RegExp(`^\\s*who\\s+has\\s+${ASSET.source}${END}`, "i")
    );
    if (whoMatch) {
      const asset = (whoMatch[1] || "").replace(/\s+/g, "").toUpperCase();
      const res = await fetch(`${BACKEND_URL}/check/${asset}`);
      const data: BackendResponse = await res.json();
      return data.reply || `🔍 No record for ${asset}.`;
    }

    // “status of PC-102”
    const statusMatch = t.match(
      new RegExp(`^\\s*(?:status\\s+of|status)\\s+${ASSET.source}${END}`, "i")
    );
    if (statusMatch) {
      const asset = (statusMatch[1] || "").replace(/\s+/g, "").toUpperCase();
      const res = await fetch(`${BACKEND_URL}/check/${asset}`);
      const data: BackendResponse = await res.json();
      return data.reply || `ℹ️ ${asset}: no data found.`;
    }

    // “where is PC-103”
    const whereMatch = t.match(
      new RegExp(`^\\s*(?:where\\s+is|loc(?:ation)?\\s+of)\\s+${ASSET.source}${END}`, "i")
    );
    if (whereMatch) {
      const asset = (whereMatch[1] || "").replace(/\s+/g, "").toUpperCase();
      const res = await fetch(`${BACKEND_URL}/check/${asset}`);
      const data: BackendResponse = await res.json();
      return data.reply || `📍 No known location for ${asset}.`;
    }

    // “assign PC-104 to jdoe”
    const assignMatch = t.match(
      new RegExp(`^\\s*assign\\s+(${ASSET.source})\\s+(?:to|->)\\s+([a-z0-9._-]+)${END}`, "i")
    );
    if (assignMatch) {
      const asset = (assignMatch[1] || "").replace(/\s+/g, "").toUpperCase();
      const user = (assignMatch[2] || "").toLowerCase();
      const res = await fetch(`${BACKEND_URL}/assign/${asset}/${user}`, {
        method: "POST",
      });
      const data: BackendResponse = await res.json();
      return data.reply || `✅ ${asset} assigned to ${user}.`;
    }

    // “unassign” or “delete PC-105”
    const unassignMatch = t.match(
      new RegExp(`^\\s*(?:unassign|delete)\\s+${ASSET.source}${END}`, "i")
    );
    if (unassignMatch) {
      const asset = (unassignMatch[1] || "").replace(/\s+/g, "").toUpperCase();
      const res = await fetch(`${BACKEND_URL}/delete/${asset}`, {
        method: "POST",
      });
      const data: BackendResponse = await res.json();
      return data.reply || `🗄️ ${asset} archived.`;
    }
  } catch (err) {
    console.error("⚠️ Backend fetch error:", err);
    return "⚠️ Could not connect to backend.";
  }

  // No match → let AI handle it
  return undefined;
}
