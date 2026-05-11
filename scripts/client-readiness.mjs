import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const slug = process.argv[2] || process.env.APP_CLIENT || process.env.EXPO_PUBLIC_CLIENT_SLUG || "mnc";
const adminRoot = process.env.ADMIN_ROOT || "/Users/marcin/mnc-admin";

const results = [];

function add(level, message) {
  results.push({ level, message });
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  if (!exists(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    add("FAIL", `Invalid JSON: ${path.relative(root, filePath)} (${error.message})`);
    return null;
  }
}

function readText(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]);
}

function relativeToNearest(filePath) {
  if (filePath.startsWith(adminRoot)) return path.relative(adminRoot, filePath);
  return path.relative(root, filePath);
}

const clientPath = path.join(root, "clients", slug, "client.config.json");
const seedPath = path.join(root, "clients", slug, "seed.json");
const dashboardPath = path.join(adminRoot, "clients", slug, "dashboard.config.json");

const client = readJson(clientPath);
const seed = readJson(seedPath);
const dashboard = readJson(dashboardPath);

if (!client) {
  add("FAIL", `Missing mobile client config: clients/${slug}/client.config.json`);
} else {
  add("PASS", `Mobile client config exists: ${relativeToNearest(clientPath)}`);

  if (client.slug === slug) add("PASS", `Mobile slug matches: ${slug}`);
  else add("FAIL", `Mobile slug is "${client.slug}", expected "${slug}"`);

  if (client.native?.easProjectId?.trim()) {
    add("PASS", "EAS project id is set");
  } else {
    add("TODO", "EAS project id is empty; create a separate EAS project before TestFlight");
  }

  for (const [assetKey, assetPath] of Object.entries(client.assets ?? {})) {
    const resolved = path.join(root, assetPath);
    if (!exists(resolved)) {
      add("FAIL", `Missing asset ${assetKey}: ${assetPath}`);
    } else if (slug !== "mnc" && assetPath.startsWith("./assets/")) {
      add("TODO", `Asset ${assetKey} still points at shared template path: ${assetPath}`);
    } else {
      add("PASS", `Asset ${assetKey} exists: ${assetPath}`);
    }
  }

  const clientRegistry = readText(path.join(root, "src", "config", "client.ts"));
  if (clientRegistry.includes(`clients/${slug}/client.config.json`) || clientRegistry.includes(`clients/${slug}/client.config`)) {
    add("PASS", "Mobile client registry includes this slug");
  } else {
    add("FAIL", "Mobile client registry does not import this client");
  }

  if (client.native?.scheme && client.tabs?.menu?.routeName) {
    add("PASS", `Native identity configured: ${client.native.scheme}, ${client.native.iosBundleIdentifier}`);
  }
}

if (!dashboard) {
  add("FAIL", `Missing dashboard config: ${dashboardPath}`);
} else {
  add("PASS", `Dashboard config exists: ${relativeToNearest(dashboardPath)}`);

  if (dashboard.slug === slug) add("PASS", `Dashboard slug matches: ${slug}`);
  else add("FAIL", `Dashboard slug is "${dashboard.slug}", expected "${slug}"`);

  const dashboardRegistry = readText(path.join(adminRoot, "src", "tenant.ts"));
  if (dashboardRegistry.includes(`clients/${slug}/dashboard.config.json`) || dashboardRegistry.includes(`clients/${slug}/dashboard.config`)) {
    add("PASS", "Dashboard registry includes this slug");
  } else {
    add("FAIL", "Dashboard registry does not import this client");
  }
}

if (client && dashboard) {
  const mobileCategories = client.menuCategories.map((category) => category.key);
  if (sameArray(mobileCategories, dashboard.menuCategories)) {
    add("PASS", `Mobile/dashboard categories match: ${mobileCategories.join(", ")}`);
  } else {
    add("FAIL", `Mobile/dashboard categories differ: mobile=${mobileCategories.join(", ")} dashboard=${(dashboard.menuCategories ?? []).join(", ")}`);
  }
}

if (!seed) {
  if (slug === "mnc") {
    add("PASS", "Seed file is optional for the existing MNC production app");
  } else {
    add("TODO", `Missing seed file: clients/${slug}/seed.json`);
  }
} else if (client) {
  add("PASS", `Seed file exists: ${relativeToNearest(seedPath)}`);

  const categoryKeys = new Set(client.menuCategories.map((category) => category.key));
  const seededCategories = new Set();
  let seedErrors = 0;

  for (const [index, item] of (seed.menuItems ?? []).entries()) {
    if (!categoryKeys.has(item.category)) {
      seedErrors += 1;
      add("FAIL", `Seed item ${index} uses unknown category: ${item.category}`);
    } else {
      seededCategories.add(item.category);
    }
  }

  for (const category of categoryKeys) {
    if (!seededCategories.has(category)) add("TODO", `Seed has no menu item for category: ${category}`);
  }

  if (seedErrors === 0 && (seed.menuItems ?? []).length > 0) {
    add("PASS", `Seed menu has ${(seed.menuItems ?? []).length} items`);
  }

  if (seed.adminEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(seed.adminEmail)) {
    add("PASS", `Seed includes first admin email: ${seed.adminEmail}`);
  } else {
    add("TODO", "Seed adminEmail is missing or placeholder-like");
  }
}

for (const [envName, description] of [
  ["EXPO_PUBLIC_SUPABASE_URL", "mobile Supabase URL"],
  ["EXPO_PUBLIC_SUPABASE_ANON_KEY", "mobile Supabase anon key"],
]) {
  if (process.env[envName]?.trim()) add("PASS", `${description} env is present`);
  else add("TODO", `${description} env is not set in this shell`);
}

const failCount = results.filter((item) => item.level === "FAIL").length;
const todoCount = results.filter((item) => item.level === "TODO").length;

console.log(`Client readiness: ${slug}`);
console.log(`Admin root: ${adminRoot}`);
console.log("");

for (const level of ["FAIL", "TODO", "PASS"]) {
  const items = results.filter((item) => item.level === level);
  if (items.length === 0) continue;
  console.log(`${level}`);
  for (const item of items) console.log(`- ${item.message}`);
  console.log("");
}

if (failCount > 0) {
  console.log(`Result: blocked by ${failCount} structural issue(s).`);
  process.exit(1);
}

if (todoCount > 0) {
  console.log(`Result: structurally OK, ${todoCount} production task(s) remain.`);
} else {
  console.log("Result: ready for production smoke test.");
}
