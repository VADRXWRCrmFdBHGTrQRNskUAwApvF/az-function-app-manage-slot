import { Core } from "../run";
import { Command } from "./command";

interface GetParamsResult {
  slotName: string;
  configCloneSlotName: string;
  subscriptionID: string;
  ressourceGroup: string;
  appName: string;
  appLocation: string;
  appSettings?: { [key: string]: string };
  action: "upsert" | "delete";
}

export class GetParams extends Command<GetParamsResult> {
  private core: Core;

  constructor({ core }: { core: Core }) {
    super();

    this.core = core;
  }

  protected async execute(): Promise<GetParamsResult> {
    const core = this.core;

    const action = core.getInput("action", { required: true });
    const slotName = core.getInput("slotName", { required: true });
    const configCloneSlotName = core.getInput("configCloneSlotName");
    const subscriptionID = core.getInput("subscriptionID", { required: true });
    const ressourceGroup = core.getInput("ressourceGroup", { required: true });
    const appName = core.getInput("appName", { required: true });
    const appLocation = core.getInput("appLocation", { required: true });
    // const tenantID = core.getInput("tenantID", { required: true });
    const rawAppSettings = core.getInput("appSettings");
    let appSettings: { [key: string]: string } | undefined;

    if (rawAppSettings) {
      try {
        appSettings = JSON.parse(rawAppSettings);
      } catch (err) {
        throw new Error(`Invalid \`appSettings\` parameter: can't parse JSON`);
      }
    }

    if (action !== "upsert" && action !== "delete") {
      throw new Error(`Unknown action: ${action}`);
    }

    return {
      slotName,
      configCloneSlotName,
      subscriptionID,
      ressourceGroup,
      appLocation,
      appName,
      appSettings,
      action: action as "upsert" | "delete",
    };
  }
}
