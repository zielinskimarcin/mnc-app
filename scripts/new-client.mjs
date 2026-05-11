import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const [slugArg, displayNameArg, bundleIdArg, schemeArg] = process.argv.slice(2);

function usage() {
  console.log(
    "Usage: npm run client:new -- <slug> \"Display Name\" <ios.bundle.id> [scheme]"
  );
  console.log(
    "Example: npm run client:new -- mozzi \"Mozzi\" com.greenvoi.mozzi mozzi"
  );
}

function toSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toScheme(value) {
  return toSlug(value).replace(/-/g, "");
}

function toIdentifier(value) {
  const parts = toSlug(value).split("-").filter(Boolean);
  return parts
    .map((part, index) =>
      index === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`
    )
    .join("");
}

if (!slugArg || !displayNameArg || !bundleIdArg) {
  usage();
  process.exit(1);
}

const slug = toSlug(slugArg);
const displayName = displayNameArg.trim();
const bundleId = bundleIdArg.trim();
const scheme = schemeArg ? toScheme(schemeArg) : toScheme(slug);

if (!slug) {
  console.error("client:new error: slug cannot be empty");
  process.exit(1);
}

const targetDir = path.join(root, "clients", slug);
const targetPath = path.join(targetDir, "client.config.json");

if (fs.existsSync(targetPath)) {
  console.error(`client:new error: ${path.relative(root, targetPath)} already exists`);
  process.exit(1);
}

const templatePath = path.join(root, "clients", "mnc", "client.config.json");
const config = JSON.parse(fs.readFileSync(templatePath, "utf8"));

config.slug = slug;
config.displayName = displayName;
config.brand.name = displayName;
config.brand.mark = "";
config.native.expoSlug = `${slug}-app`;
config.native.scheme = scheme;
config.native.iosBundleIdentifier = bundleId;
config.native.easProjectId = "";
config.admin.title = `${displayName.toUpperCase()} ADMIN`;
config.admin.basePath = `/${slug}-admin/`;

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetPath, `${JSON.stringify(config, null, 2)}\n`);

const registryPath = path.join(root, "src", "config", "client.ts");
const registry = fs.readFileSync(registryPath, "utf8");
const identifier = `${toIdentifier(slug)}Config`;
const importLine = `import ${identifier} from "../../clients/${slug}/client.config.json";`;
const registryLine = `  ${JSON.stringify(slug)}: ${identifier},`;

let updatedRegistry = registry;
if (!updatedRegistry.includes(importLine)) {
  updatedRegistry = updatedRegistry.replace(
    "// CLIENT_CONFIG_IMPORTS",
    `${importLine}\n// CLIENT_CONFIG_IMPORTS`
  );
}

if (!updatedRegistry.includes(registryLine)) {
  updatedRegistry = updatedRegistry.replace(
    "  // CLIENT_CONFIGS",
    `${registryLine}\n  // CLIENT_CONFIGS`
  );
}

fs.writeFileSync(registryPath, updatedRegistry);

console.log(`created ${path.relative(root, targetPath)}`);
console.log("Next:");
console.log("1. Replace brand assets in assets/ or point this config at client-specific assets");
console.log(`2. Run: APP_CLIENT=${slug} npm run client:validate -- ${slug}`);
console.log(`3. Run: APP_CLIENT=${slug} npx expo config --json`);
