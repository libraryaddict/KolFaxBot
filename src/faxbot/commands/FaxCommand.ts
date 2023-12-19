import type { KoLUser } from "../../utils/Typings.js";

export interface FaxCommand {
  isRestricted(): boolean;

  name(): string;

  description(): string;

  execute(sender: KoLUser, paramters: string): Promise<any>;
}
