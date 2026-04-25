import { storeDataUrl, readFile } from "../lib/storage.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/assets
 * Body: { dataUrl, kind?: "upload" | "generated", fileName? }
 */
export async function handleStoreAsset(body, res) {
  try {
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const kind = body?.kind === "generated" ? "generated" : "upload";
    const result = await storeDataUrl(dataUrl, { kind });

    return sendJson(res, 200, {
      ok: true,
      hash: result.hash,
      mimeType: result.mimeType,
      size: result.size
    });
  } catch (error) {
    console.error("[handleStoreAsset]", error);
    return sendJson(res, 400, { error: error.message || "Failed to store asset" });
  }
}

/**
 * GET /api/assets/:hash?kind=upload|generated
 */
export async function handleGetAsset(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const segments = url.pathname.split("/");
    const hash = segments[segments.length - 1];
    const kind = url.searchParams.get("kind") === "generated" ? "generated" : "upload";

    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return sendJson(res, 400, { error: "Invalid hash format" });
    }

    const buffer = await readFile(hash, { kind });
    const contentType = detectMimeType(buffer);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    res.end(buffer);
  } catch (error) {
    console.error("[handleGetAsset]", error);
    if (error.code === "ENOENT" || /no such file/i.test(error.message)) {
      return sendJson(res, 404, { error: "Asset not found" });
    }
    return sendJson(res, 500, { error: error.message || "Failed to read asset" });
  }
}

function detectMimeType(buffer) {
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4).toString("hex");
    if (header.startsWith("89504e47")) return "image/png";
    if (header.startsWith("ffd8ff")) return "image/jpeg";
    if (header.startsWith("52494646")) return "image/webp";
    if (header.startsWith("47494638")) return "image/gif";
  }

  const textPrefix = buffer.slice(0, 128).toString("utf8").trimStart();
  if (textPrefix.startsWith("<svg") || textPrefix.startsWith("<?xml")) {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}
