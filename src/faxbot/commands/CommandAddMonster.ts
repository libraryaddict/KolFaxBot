import type { KoLUser } from "../../utils/Typings";
import type { FaxCommand } from "./FaxCommand";

export class CommandAddMonster implements FaxCommand {
  isRestricted(): boolean {
    return true;
  }

  name(): string {
    return `addfax`;
  }

  description(): string {
    return `Joins your clan, grabs fax from machine, adds to an empty fax clan that was previously setup for that monster. Fax clan has title given 'Source: M1234' where 1234 is monster ID`;
  }

  execute(sender: KoLUser, paramters: string): Promise<any> {
    throw new Error(`Method not implemented.`);
  }
}
