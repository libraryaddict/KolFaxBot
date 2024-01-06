import type { ParentController } from "../../ParentController.js";
import { type KoLUser, SettingTypes } from "../../types.js";
import { getMonster } from "../monsters.js";
import type { FaxCommand } from "./FaxCommand.js";

export class CommandSetting implements FaxCommand {
  controller: ParentController;

  constructor(controller: ParentController) {
    this.controller = controller;
  }

  isRestricted(): boolean {
    return true;
  }

  name(): string {
    return "setting";
  }

  description(): string {
    return "To set or remove a setting";
  }

  async execute(sender: KoLUser, parameters: string, isAdmin: boolean) {
    const match = parameters.match(/^(\S+) (\[\d+].+?) (remove|set) ?(.+)$/);

    if (match == null) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Invalid parameter. Use the format "<${SettingTypes.join(
          "/"
        )}> [123]MonsterXmlCommand <set/remove> value?", where value is omitted if not needed`
      );

      return;
    }

    const [settingName, monster, action, value] = match;

    if (action && value == null) {
      await this.controller.client.sendPrivateMessage(sender, `Missing value!`);

      return;
    }

    if (!SettingTypes.includes(settingName)) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Unknown setting, use one of ${SettingTypes.join(", ")}`
      );

      return;
    }

    const mons = getMonster(monster);

    if (mons.length != 1 || `[${mons[0].id}]${mons[0].name}` != monster) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Unable to find a monster by that name`
      );

      return;
    }
  }
}
