import { ParentController } from "../../ParentController";
import { FaxMessages } from "../../utils/FaxMessages";
import { KOLMessage } from "../../utils/Typings";

import { FaxAdministration } from "./FaxAdministration";

export class MessageHandler {
  controller: ParentController;
  admin: FaxAdministration;
  lastKeepAlive: number = 0;

  constructor(controller: ParentController) {
    this.controller = controller;
    this.admin = controller.admin;
  }

  getSettings() {
    return this.controller.settings;
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
      this.getClient().useChatMacro(`/keepalive`);
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
        message.type == "private"
      ) {
        this.getClient().sendPrivateMessage(
          message.who,
          FaxMessages.ERROR_TOO_CLOSE_ROLLOVER
        );
      }

      return;
    }

    if (message.type == "event") {
      if (message.msg?.includes("href='clan_viplounge.php?preaction")) {
        await this.controller.fortune.checkFortuneTeller();

        return;
      }

      await this.admin.processWhitelists();

      return;
    } else if (
      message.msg == null ||
      message.who == null ||
      message.type != "private"
    ) {
      return;
    }

    if (
      message.who.id &&
      this.getSettings().allowedRefreshers.includes(message.who.id) &&
      message.msg.toLowerCase() == "refresh"
    ) {
      this.getClient().sendPrivateMessage(
        message.who,
        "Now refreshing all clans.."
      );
      await this.admin.refreshAll();
      this.getClient().sendPrivateMessage(
        message.who,
        "All clans have been refreshed"
      );

      return;
    }

    await this.getFaxRunner().handleFaxRequestWrapper(message.who, message.msg);
  }
}
