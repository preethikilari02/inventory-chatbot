import fetch from "node-fetch";

// src/app/app.ts
import { getPredefinedReply } from "./replies";
import { App } from "@microsoft/teams.apps";
import { ChatPrompt } from "@microsoft/teams.ai";
import { LocalStorage } from "@microsoft/teams.common";
import { OpenAIChatModel } from "@microsoft/teams.openai";
import { MessageActivity, TokenCredentials } from '@microsoft/teams.api';
import { ManagedIdentityCredential } from '@azure/identity';
import * as fs from 'fs';
import * as path from 'path';
import config from "../config";

// Create storage for conversation history
const storage = new LocalStorage();

// Load instructions from file on initialization
function loadInstructions(): string {
  const instructionsFilePath = path.join(__dirname, "instructions.txt");
  return fs.readFileSync(instructionsFilePath, 'utf-8').trim();
}

// Load instructions once at startup
const instructions = loadInstructions();

const createTokenFactory = () => {
  return async (scope: string | string[], tenantId?: string): Promise<string> => {
    const managedIdentityCredential = new ManagedIdentityCredential({
        clientId: process.env.CLIENT_ID
      });
    const scopes = Array.isArray(scope) ? scope : [scope];
    const tokenResponse = await managedIdentityCredential.getToken(scopes, {
      tenantId: tenantId
    });
   
    return tokenResponse.token;
  };
};

// Configure authentication using TokenCredentials
const tokenCredentials: TokenCredentials = {
  clientId: process.env.CLIENT_ID || '',
  token: createTokenFactory()
};

const credentialOptions = config.MicrosoftAppType === "UserAssignedMsi" ? { ...tokenCredentials } : undefined;

// Create the app with storage
const app = new App({
  ...credentialOptions,
  storage
});

// Handle incoming messages
app.on('message', async ({ send, stream, activity }) => {
  const text = activity.text?.trim() || "";
  const conversationKey = `${activity.conversation.id}/${activity.from.id}`;
  const messages = storage.get(conversationKey) || [];

  try {
    // 🔹 Step 1: Predefined replies first
    const predefined = await getPredefinedReply(text);
    if (predefined) {
      await send(predefined);
      return;
    }
    // 🔹 Step 1.5: Connect to backend for inventory-related commands

// 🔹 Step 1.5: Connect to backend for inventory-related commands
// 🔹 Step 1.5: Connect to permanent Render backend for inventory queries
const BACKEND_URL = process.env.BACKEND_URL || "https://inventory-bot-api.onrender.com";

if (text.toLowerCase().includes("list items")) {
  try {
    const response = await fetch(`${BACKEND_URL}/items`);
    const data = (await response.json()) as { items?: string[] };
    await send(`📦 Available items: ${data.items?.join(", ") || "No items found."}`);
  } catch (error) {
    console.error("Error fetching items:", error);
    await send("⚠️ Could not fetch inventory list from backend.");
  }
  return;
}

// “who has PC-101?” or “check PC-101”
if (text.toLowerCase().startsWith("check ") || text.toLowerCase().startsWith("who has")) {
  const parts = text.split(" ");
  const itemId = parts[parts.length - 1].replace("?", ""); // handle “who has PC-101?”
  try {
    const response = await fetch(`${BACKEND_URL}/check/${itemId}`);
    const data = (await response.json()) as { reply?: string; status?: string };
    await send(data.reply || `🔍 Status of ${itemId}: ${data.status || "Not found."}`);
  } catch (error) {
    console.error("Error checking item:", error);
    await send("⚠️ Could not connect to backend.");
  }
  return;
}

// “assign PC-101 to John”
if (text.toLowerCase().startsWith("assign ")) {
  const parts = text.split(" ");
  if (parts.length >= 4 && parts[2].toLowerCase() === "to") {
    const itemId = parts[1];
    const user = parts[3];
    try {
      const response = await fetch(`${BACKEND_URL}/assign/${itemId}/${user}`, {
        method: "POST",
      });
      const data = (await response.json()) as { reply?: string };
      await send(data.reply || `✅ ${itemId} assigned to ${user}.`);
    } catch (error) {
      console.error("Error assigning item:", error);
      await send("⚠️ Could not connect to backend.");
    }
  } else {
    await send("❌ Invalid assign command. Use: `assign <item> to <user>`");
  }
  return;
}

// “delete KB-55”
if (text.toLowerCase().startsWith("delete ")) {
  const itemId = text.split(" ")[1];
  try {
    const response = await fetch(`${BACKEND_URL}/delete/${itemId}`, { method: "POST" });
    const data = (await response.json()) as { reply?: string };
    await send(data.reply || `🗄️ ${itemId} archived.`);
  } catch (error) {
    console.error("Error deleting item:", error);
    await send("⚠️ Could not connect to backend.");
  }
  return;
}


    // 🔹 Step 2: Only use OpenAI if key is set
    if (!config.openAIKey) {
      await send("⚠️ OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file.");
      return;
    }

    const prompt = new ChatPrompt({
      messages,
      instructions,
      model: new OpenAIChatModel({
        model: config.openAIModelName,
        apiKey: config.openAIKey
      })
    });

    if (activity.conversation.isGroup) {
      const response = await prompt.send(text);
      const responseActivity = new MessageActivity(response.content)
        .addAiGenerated()
        .addFeedback();
      await send(responseActivity);
    } else {
      await prompt.send(text, {
        onChunk: (chunk) => stream.emit(chunk),
      });
      stream.emit(new MessageActivity().addAiGenerated().addFeedback());
    }

    storage.set(conversationKey, messages);
  } catch (error) {
    console.error("❌ Agent error:", error);
    await send("⚠️ The agent encountered an error or bug.");
    await send("Please check the console or fix the source code.");
  }
});


app.on('message.submit.feedback', async ({ activity }) => {
  //add custom feedback process logic here
  console.log("Your feedback is " + JSON.stringify(activity.value));
})
app.on("conversationUpdate", async ({ activity, send }) => {
  const convType = (activity.conversation as any)?.conversationType; // 'personal' | 'groupChat' | 'channel'
  const botId = activity.recipient?.id;

  if (activity.membersAdded?.length) {
    for (const member of activity.membersAdded) {
      // PERSONAL: greet when a *user* joins (not the bot)
      if (convType === "personal" && member.id !== botId) {
        await send(
          "👋 Hi! \n\n💻 ASSETBOT online. Your inventory, one command away.\n\n" +
          "Try:\n• `who has PC-101?`\n• `status of PC-102`\n• `where is PC-103?`"
        );
      }

      // GROUP CHAT / CHANNEL: greet when the *bot* is added
      if ((convType === "groupChat" || convType === "channel") && member.id === botId) {
        await send(
          "✨ Welcome Pokes! I’m ASSETBOT — your smart assistant for keeping track of laptops and gear.\n\n" +
          "Try:\n• `who has PC-101?`\n• `status of PC-102`\n• `where is PC-103?`\n" +
          "Admins can type `help` for update/assign options."
        );
      }
    }
  }
});


export default app;