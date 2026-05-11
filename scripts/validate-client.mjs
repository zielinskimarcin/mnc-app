import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const slug = process.argv[2] || process.env.APP_CLIENT || process.env.EXPO_PUBLIC_CLIENT_SLUG || "mnc";
const configPath = path.join(root, "clients", slug, "client.config.json");

function fail(message) {
  console.error(`client config error: ${message}`);
  process.exitCode = 1;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readConfig() {
  if (!fs.existsSync(configPath)) {
    fail(`missing ${path.relative(root, configPath)}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${path.relative(root, configPath)}: ${error.message}`);
    return null;
  }
}

function requireString(config, keyPath) {
  const value = keyPath.split(".").reduce((acc, key) => acc?.[key], config);
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${keyPath} must be a non-empty string`);
    return "";
  }
  return value;
}

function requirePositiveNumber(config, keyPath) {
  const value = keyPath.split(".").reduce((acc, key) => acc?.[key], config);
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    fail(`${keyPath} must be a positive number`);
  }
}

function validateLocalizedText(value, keyPath) {
  if (!isObject(value)) {
    fail(`${keyPath} must be an object`);
    return;
  }

  for (const lang of ["pl", "en"]) {
    if (typeof value[lang] !== "string" || value[lang].trim().length === 0) {
      fail(`${keyPath}.${lang} must be a non-empty string`);
    }
  }
}

function validateHex(value, keyPath) {
  if (typeof value !== "string") {
    fail(`${keyPath} must be a color string`);
    return;
  }

  if (!/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value) && !/^rgba?\(/.test(value)) {
    fail(`${keyPath} should be a hex or rgb/rgba color`);
  }
}

const config = readConfig();

if (config) {
  if (config.schemaVersion !== 1) {
    fail("schemaVersion must be 1");
  }

  const configSlug = requireString(config, "slug");
  if (configSlug !== slug) {
    fail(`slug is "${configSlug}", but active client is "${slug}"`);
  }

  requireString(config, "displayName");
  requireString(config, "brand.name");
  requireString(config, "native.expoSlug");
  requireString(config, "native.scheme");
  requireString(config, "native.iosBundleIdentifier");
  requireString(config, "assets.icon");
  requireString(config, "assets.adaptiveIcon");
  requireString(config, "assets.splashIcon");
  requireString(config, "assets.favicon");
  requireString(config, "admin.title");
  requireString(config, "admin.basePath");
  requireString(config, "admin.defaultPushScreen");
  requirePositiveNumber(config, "loyalty.maxPoints");
  requirePositiveNumber(config, "theme.spacing.page");
  requirePositiveNumber(config, "theme.typography.brandFontSize");
  requirePositiveNumber(config, "theme.typography.categoryFontSize");

  for (const key of [
    "background",
    "surface",
    "text",
    "muted",
    "divider",
    "border",
    "borderStrong",
    "primary",
    "primaryText",
    "danger",
  ]) {
    validateHex(config.theme?.colors?.[key], `theme.colors.${key}`);
  }

  for (const key of ["card", "button", "sheet"]) {
    const value = config.theme?.radii?.[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      fail(`theme.radii.${key} must be a non-negative number`);
    }
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(config.native.expoSlug ?? "")) {
    fail("native.expoSlug should be URL/EAS friendly, e.g. pogodna-app");
  }

  if (!/^[a-z][a-z0-9+.-]*$/.test(config.native.scheme ?? "")) {
    fail("native.scheme should be lowercase and URL-scheme friendly, e.g. pogodna");
  }

  if (!/^[A-Za-z0-9.-]+\.[A-Za-z0-9.-]+$/.test(config.native.iosBundleIdentifier ?? "")) {
    fail("native.iosBundleIdentifier should look like com.company.app");
  }

  if (!Array.isArray(config.menuCategories) || config.menuCategories.length === 0) {
    fail("menuCategories must contain at least one category");
  } else {
    const categoryKeys = new Set();

    config.menuCategories.forEach((category, index) => {
      const prefix = `menuCategories[${index}]`;
      const key = category?.key;
      if (typeof key !== "string" || key.trim().length === 0) {
        fail(`${prefix}.key must be a non-empty string`);
      } else if (categoryKeys.has(key)) {
        fail(`${prefix}.key duplicates "${key}"`);
      } else {
        categoryKeys.add(key);
      }

      validateLocalizedText(category?.label, `${prefix}.label`);
      requireString({ category }, "category.icon");
    });
  }

  for (const tabKey of ["menu", "points"]) {
    const tab = config.tabs?.[tabKey];
    requireString({ tab }, "tab.routeName");
    requireString({ tab }, "tab.icon");
    validateLocalizedText(tab?.label, `tabs.${tabKey}.label`);
  }

  for (const lang of ["pl", "en"]) {
    const copy = config.loyalty?.copy?.[lang];
    if (!isObject(copy)) {
      fail(`loyalty.copy.${lang} must exist`);
      continue;
    }

    requireString({ copy }, "copy.rewardReadyText");
    requireString({ copy }, "copy.pointsUntilRewardSuffix");
    if (!Array.isArray(copy.steps) || copy.steps.length === 0) {
      fail(`loyalty.copy.${lang}.steps must contain at least one item`);
    }
  }

  if (process.exitCode !== 1) {
    console.log(`client config ok: ${slug}`);
  }
}
