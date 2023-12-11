import axios from "axios";
import { addLog } from "../Settings";
import { DepositedFax, FaxbotSettings } from "./Typings";
import { FaxMessages } from "./FaxMessages";

const discordMessages: string[] = [];

let discordUrl: string;

export function setupLogging(settings: FaxbotSettings) {
  discordUrl = settings.discordWebhook;
}

function usingDiscord() {
  return (
    discordUrl != null &&
    discordUrl.startsWith("https://discord.com/api/webhooks/")
  );
}

export function logFax(fax: DepositedFax) {
  if (fax.outcome == FaxMessages.FAX_READY) {
    addDiscordMessage(
      `Faxed in '${fax.fax.name}' for ${fax.requester.name} (#${fax.requester.id}) into '${fax.clanName}'`
    );
  } else {
    addDiscordMessage(
      `Failed to fax in '${fax.fax.name}' for ${fax.requester.name} (#${fax.requester.id})`
    );
  }
}

export function addDiscordMessage(message: string) {
  if (!usingDiscord()) {
    return;
  }

  if (discordMessages.length == 0) {
    // Publish in a minute

    setTimeout(async () => {
      const lines = discordMessages.join("\n");
      discordMessages.splice(0);

      const data: WebhookData = {
        url: discordUrl,
        name: "FaxBot",
        message: lines
      };

      try {
        await postToWebhook(data);
      } catch (e) {
        addLog(e);
      }
    }, 60_000);
  }

  discordMessages.push(message);
}

interface WebhookData {
  url: string;
  name: string;
  message?: string;
  color?: number;
  image?: string;
  contentMessage?: string;
  inline?: string[];
  avatar?: string;
  threadName?: string;
}

async function postToWebhook(data: WebhookData) {
  const embed = {};

  if (data.message != null) {
    embed["description"] = data.message;
  }

  if (data.inline != null && data.inline.length > 0) {
    embed["fields"] = [];

    for (const message of data.inline) {
      embed["fields"].push({ name: "\u200b", value: message, inline: true });
    }
  }

  const json = {
    username: data.name
  };

  if (Object.keys(embed).length > 0) {
    if (data.color != null) {
      embed["color"] = data.color;
      embed["thumbnail"] = { url: data.image };
    }

    json["embeds"] = [embed];
  }

  if (data.avatar != null) {
    json["avatar_url"] = data.avatar;
  }

  if (data.contentMessage != null) {
    json["content"] = data.contentMessage ?? "";
  }

  if (data.threadName != null) {
    json["thread_name"] = data.threadName;
  }

  const hookData = { payload_json: json };

  console.log(JSON.stringify(json));

  try {
    await axios.post(
      data.url,
      new URLSearchParams({
        payload_json: JSON.stringify(json)
      }),
      {
        method: "POST"
        //headers: { "Content-Type": "application/json" }
      }
    );
  } catch (e) {
    addLog("Error: ", e);
  }
}
