import type { KoLUser } from "../../utils/Typings";

export interface FaxCommand {
  isRestricted(): boolean;

  name(): string;

  description(): string;

  execute(sender: KoLUser, paramters: string): Promise<any>;
}
