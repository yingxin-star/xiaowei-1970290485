import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const root = resolve(scriptDir, "..");
const inputPath = join(root, "content", "manifest.json");
const outputPath = join(root, "dist");
const maxBytes = { image: 6 * 1024 * 1024, audio: 12 * 1024 * 1024 };
const maxTotalBytes = 120 * 1024 * 1024;
const imageTypes = new Map([["image/gif", ".gif"], ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);
const audioTypes = new Map([["audio/mpeg", ".mp3"], ["audio/ogg", ".ogg"], ["audio/wav", ".wav"], ["audio/x-wav", ".wav"]]);

const log = [];
let totalBytes = 0;

async function copySite() {
  await mkdir(join(outputPath, "content"), { recursive: true });
  await mkdir(join(outputPath, "media"), { recursive: true });
  await copyFile(join(root, "index.html"), join(outputPath, "index.html"));
  await copyFile(join(root, "styles.css"), join(outputPath, "styles.css"));
  await copyFile(join(root, "app.js"), join(outputPath, "app.js"));
  await copyFile(join(root, "favicon.svg"), join(outputPath, "favicon.svg"));
}

function isRemote(value) {
  return typeof value === "string" && /^https:\/\//i.test(value);
}

function isLocal(value) {
  return typeof value === "string" && !/^[a-z]+:/i.test(value) && !value.startsWith("/");
}

function safeLocalPath(value) {
  const candidate = resolve(root, value);
  const rootRelative = relative(root, candidate);
  if (!rootRelative || rootRelative.startsWith("..")) throw new Error(`unsafe local path: ${value}`);
  return candidate;
}

async function writeRemote(url, itemId, field, kind, allowedHosts) {
  const parsed = new URL(url);
  if (!allowedHosts.has(parsed.hostname)) throw new Error(`host not allowed: ${parsed.hostname}`);
  if (totalBytes >= maxTotalBytes) throw new Error("total media budget reached");

  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const finalHost = new URL(response.url).hostname;
  if (!allowedHosts.has(finalHost)) throw new Error(`redirect host not allowed: ${finalHost}`);
  const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  const extensions = kind === "audio" ? audioTypes : imageTypes;
  const extension = extensions.get(contentType);
  if (!extension) throw new Error(`unsupported MIME: ${contentType || "unknown"}`);
  const limit = maxBytes[kind];
  const advertised = Number(response.headers.get("content-length") || 0);
  if (advertised > limit || totalBytes + advertised > maxTotalBytes) throw new Error("size limit exceeded");

  const reader = response.body?.getReader();
  if (!reader) throw new Error("response has no readable body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit || totalBytes + size > maxTotalBytes) {
      await reader.cancel();
      throw new Error("size limit exceeded");
    }
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks, size);
  const filename = `${itemId}-${field}${extension}`;
  await writeFile(join(outputPath, "media", filename), bytes);
  totalBytes += bytes.length;
  return `media/${filename}`;
}

async function copyLocal(value, itemId, field, kind) {
  const source = safeLocalPath(value);
  const info = await stat(source);
  const limit = maxBytes[kind];
  if (info.size > limit || totalBytes + info.size > maxTotalBytes) throw new Error("size limit exceeded");
  const extension = extname(source).toLowerCase();
  const allowed = kind === "audio" ? new Set(audioTypes.values()) : new Set(imageTypes.values());
  if (!allowed.has(extension)) throw new Error(`unsupported extension: ${extension || "none"}`);
  const filename = `${itemId}-${field}${extension}`;
  await copyFile(source, join(outputPath, "media", filename));
  totalBytes += info.size;
  return `media/${filename}`;
}

async function syncField(value, itemId, field, kind, allowedHosts) {
  if (!value || typeof value === "object") return value;
  try {
    if (isRemote(value)) return await writeRemote(value, itemId, field, kind, allowedHosts);
    if (isLocal(value)) return await copyLocal(value, itemId, field, kind);
    throw new Error("only HTTPS URLs or local relative paths are supported");
  } catch (error) {
    log.push({ itemId, field, value, status: "skipped", reason: error.message });
    return null;
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(inputPath, "utf8"));
  const allowedHosts = new Set((manifest.allowedHosts || []).map((host) => String(host).toLowerCase()));
  await copySite();

  const items = [];
  for (const item of Array.isArray(manifest.items) ? manifest.items : []) {
    if (!item || !item.id || !item.type) {
      log.push({ itemId: item?.id || "unknown", status: "skipped", reason: "item needs id and type" });
      continue;
    }
    const copy = { ...item };
    copy.media = await syncField(item.media, item.id, "media", "image", allowedHosts);
    copy.audio = await syncField(item.audio, item.id, "audio", "audio", allowedHosts);
    items.push(copy);
  }

  await writeFile(join(outputPath, "content", "manifest.json"), `${JSON.stringify({ ...manifest, items }, null, 2)}\n`);
  await writeFile(join(outputPath, "sync-report.json"), `${JSON.stringify({ totalBytes, skipped: log }, null, 2)}\n`);
  console.log(`Built ${items.length} items with ${totalBytes} bytes of media.`);
  if (log.length) console.log(`Skipped ${log.length} media entries; see dist/sync-report.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
