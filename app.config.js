const appConfig = require("./app.json");

const requiredEasEnv = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

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

module.exports = appConfig;
