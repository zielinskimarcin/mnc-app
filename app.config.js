const fs = require("fs");
const path = require("path");

const requiredEasEnv = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

function readClientConfig() {
  const slug =
    process.env.APP_CLIENT ||
    process.env.EXPO_PUBLIC_CLIENT_SLUG ||
    "mnc";
  const configPath = path.join(__dirname, "clients", slug, "client.config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Unknown app client "${slug}". Expected config at ${configPath}`
    );
  }

  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

module.exports = ({ config }) => {
  const client = readClientConfig();

  process.env.EXPO_PUBLIC_CLIENT_SLUG = client.slug;

  if (process.env.EAS_BUILD) {
    const missing = requiredEasEnv.filter((name) => {
      const value = process.env[name];
      return !value || value.trim().length === 0;
    });

    if (missing.length > 0) {
      throw new Error(
        `Missing required EAS environment variables: ${missing.join(", ")}`
      );
    }
  }

  return {
    ...config,
    name: client.displayName,
    slug: client.native.expoSlug,
    scheme: client.native.scheme,
    icon: client.assets.icon,
    splash: {
      ...config.splash,
      image: client.assets.splashIcon,
      resizeMode: config.splash?.resizeMode ?? "contain",
      backgroundColor: client.theme.colors.background,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: client.native.iosBundleIdentifier,
      usesAppleSignIn: true,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: client.assets.adaptiveIcon,
        backgroundColor: client.theme.colors.background,
      },
    },
    web: {
      ...config.web,
      favicon: client.assets.favicon,
    },
    extra: {
      ...config.extra,
      clientSlug: client.slug,
      eas: {
        ...config.extra?.eas,
        projectId: client.native.easProjectId || config.extra?.eas?.projectId,
      },
    },
  };
};
