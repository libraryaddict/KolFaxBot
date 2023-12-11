import { Mutex } from "async-mutex";
import { ParentController } from "../ParentController";
import { FaxRollover } from "./tasks/FaxRollover";
import { MessageHandler } from "./tasks/MessageHandler";

export class FaxHeartbeat {
  controller: ParentController;
  messagesMutex = new Mutex();
  rollover: FaxRollover;
  messages: MessageHandler;

  constructor(controller: ParentController) {
    this.controller = controller;
    this.rollover = new FaxRollover(controller);
    this.messages = new MessageHandler(controller);
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

  doFaxbotHeartbeat() {
    if (this.messagesMutex.isLocked()) {
      return;
    }

    this.messagesMutex.runExclusive(async () => {
      if (this.getClient().isRolloverFaxTime()) {
        await this.rollover.runFaxRollover();
      }

      await this.messages.pollMessages();
    });
  }
}
