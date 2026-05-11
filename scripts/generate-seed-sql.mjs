import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const slug = process.argv[2] || process.env.APP_CLIENT || process.env.EXPO_PUBLIC_CLIENT_SLUG || "mnc";
const clientPath = path.join(root, "clients", slug, "client.config.json");
const seedPath = path.join(root, "clients", slug, "seed.json");

function fail(message) {
  console.error(`seed sql error: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing ${path.relative(root, filePath)}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlTextArray(values) {
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function validateSeed(client, seed) {
  if (seed.schemaVersion !== 1) fail("seed.schemaVersion must be 1");
  if (seed.slug !== slug) fail(`seed.slug is "${seed.slug}", expected "${slug}"`);
  if (client.slug !== slug) fail(`client.slug is "${client.slug}", expected "${slug}"`);

  const categoryKeys = new Set(client.menuCategories.map((category) => category.key));

  if (!Array.isArray(seed.menuItems) || seed.menuItems.length === 0) {
    fail("seed.menuItems must contain at least one item");
  }

  for (const [index, item] of seed.menuItems.entries()) {
    const prefix = `seed.menuItems[${index}]`;
    if (!categoryKeys.has(item.category)) fail(`${prefix}.category "${item.category}" is not in client menuCategories`);
    if (typeof item.section !== "string" || item.section.trim().length === 0) fail(`${prefix}.section must be set`);
    if (typeof item.title !== "string" || item.title.trim().length === 0) fail(`${prefix}.title must be set`);
    if (!Number.isInteger(item.price) || item.price < 0) fail(`${prefix}.price must be a non-negative integer in grosze`);
    if (!Number.isInteger(item.orderIndex) || item.orderIndex < 0) fail(`${prefix}.orderIndex must be a non-negative integer`);
  }
}

function buildSql(client, seed) {
  const categoryKeys = client.menuCategories.map((category) => category.key);
  const appConfig = {
    client_slug: slug,
    brand_name: client.displayName,
    reward_threshold: String(client.loyalty.maxPoints),
    ...(seed.appConfig ?? {}),
  };

  const menuRows = seed.menuItems.map((item) =>
    [
      sqlString(item.category),
      sqlString(item.section),
      sqlString(item.title),
      sqlString(item.description ?? null),
      Number(item.price),
      Number(item.orderIndex),
      "true",
    ].join(", ")
  );

  const configRows = Object.entries(appConfig).map(([key, value]) =>
    `  (${sqlString(key)}, ${sqlString(value)})`
  );

  return `-- Seed for ${client.displayName} (${slug})
-- Apply only to this client's isolated Supabase project.
-- Re-running this seed replaces menu rows for configured categories:
-- ${categoryKeys.join(", ")}

begin;

delete from public.menu_items
where category = any(${sqlTextArray(categoryKeys)});

insert into public.menu_items (
  category,
  section,
  title,
  description,
  price,
  order_index,
  is_active
)
values
  (${menuRows.join("),\n  (")});

insert into public.app_config (key, value)
values
${configRows.join(",\n")}
on conflict (key) do update
set value = excluded.value;

commit;

-- First admin setup:
-- 1. Create/sign in the first admin account in the app or Supabase Auth:
--    ${seed.adminEmail ?? "owner@example.com"}
-- 2. Then run this in the client's Supabase SQL editor:
--    update public.profiles set role = 'admin' where email = ${sqlString(seed.adminEmail ?? "owner@example.com")};
`;
}

const client = readJson(clientPath);
const seed = readJson(seedPath);

validateSeed(client, seed);
process.stdout.write(buildSql(client, seed));
