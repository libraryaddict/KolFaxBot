import { config } from "../../config.js";
import type { ParentController } from "../../ParentController.js";
import { FaxMessages } from "../../utils/FaxMessages.js";
import type { KOLMessage } from "../../utils/Typings.js";
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

  constructor(controller: ParentController) {
    this.controller = controller;
    this.admin = controller.admin;

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

    for (const message of messages) {
      await this.processMessage(message);
    }

    if (messages.length > 0) {
      return;
    }

    await this.admin.runAdministration();
  }

  async processMessage(message: KOLMessage) {
    this.admin.pruneFaxes();

    if (this.getClient().isRolloverRisk(3)) {
      if (
        message.msg != null &&
        message.who != null &&
        message.who.id != null &&
        message.who.id != this.getClient().getUserID() &&
        message.type == `private`
      ) {
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

      if (
        command != null &&
        (!command.isRestricted() ||
          config.BOT_CONTROLLERS.split(`,`).includes(message.who.id))
      ) {
        await command.execute(
          message.who,
          message.msg.substring(name.length).trim()
        );

        return;
      }
    }

    await this.getFaxRunner().handleFaxRequestWrapper(message.who, message.msg);
  }
}
