import { config } from "../../config.js";
import type { ParentController } from "../../ParentController.js";
import { addLog } from "../../Settings.js";
import type { KOLMessage } from "../../types.js";
import { FaxMessages } from "../../utils/messages.js";
import { CommandAddMonster } from "../commands/CommandAddMonster.js";
import { CommandHelp } from "../commands/CommandHelp.js";
import { CommandRefresh } from "../commands/CommandRefresh.js";
import type { FaxCommand } from "../commands/FaxCommand.js";
import type { FaxAdministration } from "./FaxAdministration.js";

export class MessageHandler {
  controller: ParentController;
  admin: FaxAdministration;
  lastKeepAlive: number = 0;
  commands: FaxCommand[] = [];
  admins: string[];

  constructor(controller: ParentController) {
    this.controller = controller;
    this.admin = controller.admin;
    this.admins = config.BOT_CONTROLLERS.split(`,`);

    this.registerCommands();
  }

  registerCommands() {
    this.commands.push(new CommandHelp(this.controller));
    this.commands.push(new CommandRefresh(this.controller));
    this.commands.push(new CommandAddMonster(this.controller));
  }

  getFaxRunner() {
    return this.controller.faxer;
  }

  getClient() {
    return this.controller.client;
  }

  async pollMessages() {
    if (this.lastKeepAlive + 30_000 < Date.now()) {
      this.lastKeepAlive = Date.now();
      // Nonsense command that forces kol to consider us as online due to it "timing out" every minute
      await this.getClient().useChatMacro(`/keepalive`);
    }

    const messages = await this.getClient().fetchNewMessages();
    // Value is false if not warned, true if warned
    const processedPlayers: Map<string, boolean> = new Map();
    let lastPolled = Date.now();
    const hadMessages = messages.length > 0;

    // While there are messages to process
    while (messages.length > 0) {
      // First in, first out
      const msg = messages.shift();

      // Always ignore self
      if (msg.who != null && msg.who.id == this.getClient().getUserID()) {
        continue;
      }

      // If this is a private message
      if (this.isPrivateMessage(msg)) {
        const playerId = msg.who.id;

        // If they've had a message processed in the last 3 seconds
        if (processedPlayers.has(playerId)) {
          // If they've not been warned yet
          if (processedPlayers.get(playerId) == false) {
            // Mark them as warned
            processedPlayers.set(playerId, true);

            // Warn them
            await this.getClient().sendPrivateMessage(
              msg.who,
              "Please don't spam me with requests!"
            );
          }

          // Don't process this message
          continue;
        } else {
          // Don't process any more messages from them this poll
          processedPlayers.set(playerId, false);
        }
      }

      await this.processMessage(msg);

      // If this has taken more than 2 seconds since last poll, then fetch more messages instead of a 3 second wait
      if (lastPolled + 2000 < Date.now()) {
        // Update messages with any new messages
        messages.push(...(await this.getClient().fetchNewMessages()));
        lastPolled = Date.now();
      }
    }

    if (hadMessages) {
      return;
    }

    await this.admin.runAdministration();
  }

  isPrivateMessage(message: KOLMessage): boolean {
    return (
      message.msg != null &&
      message.who != null &&
      message.who.id != null &&
      message.type == `private`
    );
  }

  async processMessage(message: KOLMessage) {
    this.admin.pruneFaxes();

    if (this.getClient().isRolloverRisk(3)) {
      if (this.isPrivateMessage(message)) {
        await this.getClient().sendPrivateMessage(
          message.who,
          FaxMessages.ERROR_TOO_CLOSE_ROLLOVER
        );
      }

      return;
    }

    if (message.type == `event`) {
      if (message.msg?.includes(`href='clan_viplounge.php?preaction`)) {
        await this.controller.fortune.checkFortuneTeller();

        return;
      }

      await this.admin.processWhitelists();

      return;
    } else if (
      message.msg == null ||
      message.who == null ||
      message.type != `private`
    ) {
      return;
    }

    if (/^\d+$/.test(message.who.id)) {
      const name = message.msg.split(` `)[0].toLowerCase();

      const command = this.commands.find((c) => c.name() == name);
      const admin = this.admins.includes(message.who.id);

      if (command != null && (!command.isRestricted() || admin)) {
        addLog(
          `Now handling command '${message.msg}' for ${message.who.name} (#${message.who.id})`
        );
        await command.execute(
          message.who,
          message.msg.substring(name.length).trim(),
          admin
        );

        return;
      }
    }

    await this.getFaxRunner().handleFaxRequestWrapper(message.who, message.msg);
  }
}
