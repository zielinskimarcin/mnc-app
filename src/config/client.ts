import mncConfig from "../../clients/mnc/client.config.json";
// CLIENT_CONFIG_IMPORTS

export type ClientConfig = typeof mncConfig;

const clientConfigs = {
  mnc: mncConfig,
  // CLIENT_CONFIGS
} satisfies Record<string, ClientConfig>;

export type ClientSlug = keyof typeof clientConfigs;

const fallbackSlug = "mnc" satisfies ClientSlug;
const requestedSlug = process.env.EXPO_PUBLIC_CLIENT_SLUG?.trim() as ClientSlug | undefined;

export const activeClientSlug: ClientSlug =
  requestedSlug && requestedSlug in clientConfigs ? requestedSlug : fallbackSlug;

export const clientConfig = clientConfigs[activeClientSlug];
