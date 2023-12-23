import type { KoLUser } from "../../types.js";

export interface FaxCommand {
  isRestricted(): boolean;

  name(): string;

  description(): string;

  execute(sender: KoLUser, paramters: string, isAdmin: boolean): Promise<any>;
}
