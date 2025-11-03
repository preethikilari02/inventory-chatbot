// src/app/replies.ts
// Return a predefined reply if the user's text matches any rule; else undefined.
 
function normalizeInput(text: string): string {
  return (text || "")
    .replace(/\u00A0/g, " ")       // non-breaking spaces -> normal
    .replace(/\s+/g, " ")          // collapse whitespace
    .trim()
    .toLowerCase();
}
 
// A loose "asset id" matcher that accepts PC-101, PC 101, PC101, abc-123, printer_02, etc.
const ASSET = /([a-z]{1,8}[- ]?\d{1,6}|[a-z0-9._-]+)/i;
 
// Optional trailing punctuation like ?! or a period
const END = String.raw`[?.!"]*\s*$`;
 
export function getPredefinedReply(text: string): string | undefined {
  const t = normalizeInput(text);
 
  // Simple greetings / help (more aliases)
  if (/^(hi|hello|hey|yo|hola)\b/.test(t)) {
    return "Hi there! 👋 I’m ASSETBOT. Try: `who has PC-101?`, `status of PC-102`, or `help` to see commands.";
  }
  if (/^(help|commands?|menu|\?)$/.test(t)) {
    return [
      "Here’s what I can do:",
      "• `who has <asset-id>` – shows current assignee",
      "• `status of <asset-id>` – shows location & condition",
      "• `where is <asset-id>` – quick location lookup",
      "• `assign <asset-id> to <netid>` – update the owner (admins only)",
      "• `unassign <asset-id>` – release the asset (admins only)"
    ].join("\n");
  }
 
  // Regex rules (order matters; first match wins)
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    // who has PC-101 / PC 101 / PC101 ?
    [new RegExp(`^\\s*who\\s+has\\s+${ASSET.source}${END}`, "i"), (m) => {
      const asset = (m[1] || "").replace(/\s+/g, "").toUpperCase();
      return `I think **${asset}** is checked out to: **John Doe (jdoe)**. _(Demo reply)_`;
    }],
 
    // status of PC-102
    [new RegExp(`^\\s*(?:status\\s+of|status)\\s+${ASSET.source}${END}`, "i"), (m) => {
      const asset = (m[1] || "").replace(/\s+/g, "").toUpperCase();
      return `Status for **${asset}** → Location: *IT Closet A*, Condition: *Good*, Last Scan: *today*. _(Demo reply)_`;
    }],
 
    // where is PC-103 / location of PC-103
    [new RegExp(`^\\s*(?:where\\s+is|loc(?:ation)?\\s+of)\\s+${ASSET.source}${END}`, "i"), (m) => {
      const asset = (m[1] || "").replace(/\s+/g, "").toUpperCase();
      return `**${asset}** was last seen in *Boone Pickens 210* at *9:42 AM*. _(Demo reply)_`;
    }],
 
    // assign PC-104 to jdoe  / assign pc104 -> jdoe
    [new RegExp(`^\\s*assign\\s+(${ASSET.source})\\s+(?:to|->)\\s+([a-z0-9._-]+)${END}`, "i"), (m) => {
      const asset = (m[1] || "").replace(/\s+/g, "").toUpperCase();
      const user  = (m[2] || "").toLowerCase();
      return `Assigning **${asset}** to **${user}**… _(Demo only, no DB write)_`;
    }],
 
    // unassign PC-105
    [new RegExp(`^\\s*unassign\\s+${ASSET.source}${END}`, "i"), (m) => {
      const asset = (m[1] || "").replace(/\s+/g, "").toUpperCase();
      return `Unassigning **${asset}**… _(Demo only, no DB write)_`;
    }],
 
    // ping/pong quick check
    [/^\s*ping\s*$/i, () => "pong"],
  ];
 
  for (const [re, fn] of rules) {
    const match = t.match(re);
    if (match) return fn(match);
  }
 
  // No match → let the LLM handle it
  return undefined;
}