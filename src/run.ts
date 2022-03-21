import { paramCase } from "change-case";
import * as core from "@actions/core";
import { DefaultAzureCredential } from "@azure/identity";
import {
  WebAppsListApplicationSettingsSlotResponse,
  WebSiteManagementClient,
} from "@azure/arm-appservice";
import { GetParams } from "./commands/getParams";

export type Core = {
  getInput: (s: string, opts?: core.InputOptions) => string;
  setFailed: (err: Error) => void;
};

const authenticate = async () => {
  return new DefaultAzureCredential();
};

const deleteSlot = async ({
  ressourceGroup,
  appName,
  slotName,
  client,
}: {
  appName: string;
  ressourceGroup: string;
  slotName: string;
  client: WebSiteManagementClient;
}) => {
  await client.webApps.deleteSlot(ressourceGroup, appName, slotName);
};

export async function run({
  injectedCore,
}: { injectedCore?: Core } = {}): Promise<void> {
  try {
    const getParams = new GetParams({ core: injectedCore || core });

    const {
      slotName: candidateSlotName,
      configCloneSlotName,
      subscriptionID,
      ressourceGroup,
      appName,
      appLocation,
      appSettings,
      action,
    } = await getParams.run();

    const credentials = await authenticate();

    const slotName = paramCase(candidateSlotName);

    const client = new WebSiteManagementClient(credentials, subscriptionID);

    core.info("Authenticated with azure");

    if (action === "delete") {
      return deleteSlot({ ressourceGroup, client, appName, slotName });
    }

    const slotResponse = await client.webApps.beginCreateOrUpdateSlotAndWait(
      ressourceGroup,
      appName,
      slotName,
      {
        location: appLocation,
      }
    );

    core.info(`Created slot ${slotName}`);

    let slotConfig: WebAppsListApplicationSettingsSlotResponse | undefined;

    // Get config from slot
    if (configCloneSlotName) {
      slotConfig = await client.webApps.listApplicationSettingsSlot(
        ressourceGroup,
        appName,
        configCloneSlotName
      );
    } else {
      // Get config from main slot only if we actually change the config
      slotConfig = await client.webApps.listApplicationSettings(
        ressourceGroup,
        appName
      );
    }

    // Apply the config only if we have something to change
    if (slotConfig) {
      slotConfig.properties = Object.assign(
        {},
        slotConfig.properties,
        appSettings
      );

      await client.webApps.updateApplicationSettingsSlot(
        ressourceGroup,
        appName,
        slotName,
        slotConfig
      );

      core.info("Applied app settings");
    }

    const publishProfileResponse =
      await client.webApps.listPublishingProfileXmlWithSecretsSlot(
        ressourceGroup,
        appName,
        slotName,
        {}
      );

    const publishProfile = publishProfileResponse.readableStreamBody?.read();

    if (!publishProfile) {
      throw new Error(`Cannot retrieve publish profile`);
    }

    core.info("Retrieved publish profile");

    const publishProfileValue = publishProfile.toString();

    core.setSecret(publishProfileValue);
    core.setOutput("PUBLISH_PROFILE", publishProfileValue);
    core.setOutput("SLOT_NAME", slotName);
    core.setOutput("SLOT_URL", `https://${slotResponse.defaultHostName}`);
    core.setOutput(
      "SLOT_URLS",
      slotResponse.enabledHostNames?.map((h: any) => `https://${h}`)
    );

    core.info("Success!");
  } catch (error: any) {
    console.error(error);
    (injectedCore || core).setFailed(error.message);
  }
}
