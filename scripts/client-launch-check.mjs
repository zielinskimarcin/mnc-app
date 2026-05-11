import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith("--")) || process.env.APP_CLIENT || process.env.EXPO_PUBLIC_CLIENT_SLUG || "mnc";
const full = args.includes("--full");
const adminRoot = process.env.ADMIN_ROOT || "/Users/marcin/mnc-admin";
const dashboardDomain = process.env.DASHBOARD_DOMAIN || "appkadokawy.pl";

const checks = [];

function add(level, title, detail = "") {
  checks.push({ level, title, detail });
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  if (!exists(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    add("FAIL", `Invalid JSON: ${path.relative(root, filePath)}`, error.message);
    return null;
  }
}

function runCommand({ title, cmd, commandArgs, cwd = root, env = {}, capture = true, required = true }) {
  const result = spawnSync(cmd, commandArgs, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: false,
  });

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  const output = [stdout, stderr].filter(Boolean).join("\n");

  if (result.status === 0) {
    add("PASS", title, capture ? output : "");
    return { ok: true, output };
  }

  add(required ? "FAIL" : "TODO", title, output || `Exited with ${result.status}`);
  return { ok: false, output };
}

function printSection(title, items) {
  if (items.length === 0) return;
  console.log(title);
  for (const item of items) {
    console.log(`- ${item.title}`);
    if (item.detail) {
      const lines = item.detail.split("\n").filter(Boolean);
      for (const line of lines.slice(0, 12)) console.log(`  ${line}`);
      if (lines.length > 12) console.log(`  ... ${lines.length - 12} more line(s)`);
    }
  }
  console.log("");
}

const clientPath = path.join(root, "clients", slug, "client.config.json");
const seedPath = path.join(root, "clients", slug, "seed.json");
const dashboardPath = path.join(adminRoot, "clients", slug, "dashboard.config.json");

const client = readJson(clientPath);
const dashboard = readJson(dashboardPath);
const seed = readJson(seedPath);
let readinessResultLine = "";

console.log(`Client launch check: ${slug}`);
console.log(`Mobile root: ${root}`);
console.log(`Admin root: ${adminRoot}`);
console.log(`Mode: ${full ? "full" : "fast"}${full ? "" : " (pass --full to run typecheck, dashboard build, and lint)"}`);
console.log("");

runCommand({
  title: "Mobile client config validates",
  cmd: "node",
  commandArgs: ["scripts/validate-client.mjs", slug],
});

runCommand({
  title: "Dashboard client config validates",
  cmd: "node",
  commandArgs: ["scripts/validate-dashboard-client.mjs", slug],
  cwd: adminRoot,
});

const readiness = runCommand({
  title: "Readiness report generated",
  cmd: "node",
  commandArgs: ["scripts/client-readiness.mjs", slug],
});

readinessResultLine = readiness.output.split("\n").find((line) => line.startsWith("Result:")) ?? "";

if (seed) {
  const seedSql = runCommand({
    title: "Seed SQL generates",
    cmd: "node",
    commandArgs: ["scripts/generate-seed-sql.mjs", slug],
    capture: false,
  });

  if (seedSql.ok) {
    const item = checks.find((check) => check.title === "Seed SQL generates");
    if (item) item.detail = `Run when the isolated Supabase project is ready: npm run client:seed-sql -- ${slug}`;
  }
} else {
  if (slug === "mnc") {
    add("PASS", "Seed SQL skipped", "Seed file is optional for the existing MNC production app");
  } else {
    add("TODO", "Seed SQL skipped", `Missing clients/${slug}/seed.json`);
  }
}

const expoConfig = runCommand({
  title: "Expo config resolves for active client",
  cmd: "npx",
  commandArgs: ["expo", "config", "--json"],
  env: {
    APP_CLIENT: slug,
    EXPO_PUBLIC_CLIENT_SLUG: slug,
  },
  capture: false,
});

if (expoConfig.ok) {
  try {
    const expo = JSON.parse(expoConfig.output);
    const easProjectId = expo.extra?.eas?.projectId ?? "";
    const detail = [
      `name=${expo.name}`,
      `slug=${expo.slug}`,
      `scheme=${expo.scheme}`,
      `ios.bundleIdentifier=${expo.ios?.bundleIdentifier}`,
      `eas.projectId=${easProjectId || "(empty)"}`,
    ].join("\n");
    const item = checks.find((check) => check.title === "Expo config resolves for active client");
    if (item) item.detail = detail;
  } catch (error) {
    add("FAIL", "Expo config JSON parse failed", error.message);
  }
}

if (client && dashboard) {
  const mobileCategories = client.menuCategories.map((category) => category.key);
  if (JSON.stringify(mobileCategories) === JSON.stringify(dashboard.menuCategories)) {
    add("PASS", "Mobile/dashboard menu categories match", mobileCategories.join(", "));
  } else {
    add(
      "FAIL",
      "Mobile/dashboard menu categories differ",
      `mobile=${mobileCategories.join(", ")}\ndashboard=${(dashboard.menuCategories ?? []).join(", ")}`
    );
  }
}

if (client) {
  if (client.native?.easProjectId?.trim()) {
    add("PASS", "Production EAS project id is present");
  } else {
    add("TODO", "Create separate EAS project", `Fill clients/${slug}/client.config.json native.easProjectId before production build`);
  }

  const sharedAssets = Object.entries(client.assets ?? {}).filter(([, value]) => String(value).startsWith("./assets/"));
  if (sharedAssets.length === 0) {
    add("PASS", "Client assets are not using shared template paths");
  } else if (slug !== "mnc") {
    add(
      "TODO",
      "Replace shared template assets",
      sharedAssets.map(([key, value]) => `${key}: ${value}`).join("\n")
    );
  } else {
    add("PASS", "MNC uses the root asset set", sharedAssets.map(([key, value]) => `${key}: ${value}`).join("\n"));
  }
}

for (const [envName, label] of [
  ["EXPO_PUBLIC_SUPABASE_URL", "Mobile Supabase URL"],
  ["EXPO_PUBLIC_SUPABASE_ANON_KEY", "Mobile Supabase anon key"],
  ["VITE_SUPABASE_URL", "Dashboard Supabase URL"],
  ["VITE_SUPABASE_ANON_KEY", "Dashboard Supabase anon key"],
]) {
  if (process.env[envName]?.trim()) {
    add("PASS", `${label} env is present`, envName);
  } else {
    add("TODO", `${label} env is not set in this shell`, envName);
  }
}

if (full) {
  runCommand({
    title: "Mobile TypeScript passes",
    cmd: "npm",
    commandArgs: ["run", "typecheck"],
    capture: false,
  });

  runCommand({
    title: "Dashboard build passes",
    cmd: "npm",
    commandArgs: ["run", "build"],
    cwd: adminRoot,
    env: { VITE_CLIENT_SLUG: slug },
    capture: false,
  });

  runCommand({
    title: "Dashboard lint passes",
    cmd: "npm",
    commandArgs: ["run", "lint"],
    cwd: adminRoot,
    capture: false,
  });
}

const manualTasks =
  slug === "mnc"
    ? [
        "MNC is the existing live/base client; do not create a new Supabase project unless intentionally reprovisioning it.",
        "Set mobile/dashboard Supabase env vars in this shell or deployment when running production checks.",
        "For a Vercel dashboard deployment, use VITE_CLIENT_SLUG=mnc and attach mnc.<your-domain>.",
        "Run physical-device smoke tests before changing TestFlight/production.",
      ]
    : [
        "Create isolated Supabase project for this client.",
        "Apply all migrations from supabase/migrations to that project.",
        "Deploy Edge Functions: delete_user, register_push_token, track_push_open, send_push, run_scheduled_push, dashboard_stats.",
        "Set Edge Function secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.",
        `Apply seed SQL: npm run client:seed-sql -- ${slug}`,
        "Create first admin auth account, then update public.profiles.role to admin.",
        "Configure Supabase Auth redirect URLs and Google/Apple providers for the client scheme/bundle id.",
        "Create separate EAS project and App Store Connect app.",
        "Enable Push Notifications and Sign in with Apple in Apple Developer.",
        `Deploy dashboard to Vercel with VITE_CLIENT_SLUG=${slug} and attach ${slug}.${dashboardDomain}.`,
        "Run physical-device smoke test before sending TestFlight to the owner.",
      ];

printSection("FAIL", checks.filter((item) => item.level === "FAIL"));
printSection("TODO", checks.filter((item) => item.level === "TODO"));
printSection("PASS", checks.filter((item) => item.level === "PASS"));

console.log("MANUAL NEXT STEPS");
for (const task of manualTasks) console.log(`- ${task}`);
console.log("");

if (readinessResultLine) console.log(readinessResultLine);

const failCount = checks.filter((item) => item.level === "FAIL").length;
const todoCount = checks.filter((item) => item.level === "TODO").length;

if (failCount > 0) {
  console.log(`Launch check blocked: ${failCount} failure(s), ${todoCount} todo(s).`);
  process.exit(1);
}

console.log(`Launch check complete: 0 failure(s), ${todoCount} top-level todo(s).`);
