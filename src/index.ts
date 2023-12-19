import { ParentController } from "./ParentController";

new ParentController().startController().catch((e) => {
  throw e;
});
