import fs from "node:fs";
import path from "node:path";

export function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

export function readJson(req, { maxBodyBytes } = {}) {
  return readRequestBody(req, { maxBodyBytes }).then((buffer) => {
    const raw = buffer.toString("utf8");
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Invalid JSON body.");
    }
  });
}

export function readBodyBuffer(req, { maxBodyBytes } = {}) {
  return readRequestBody(req, { maxBodyBytes });
}

export function createStaticFileHandler(publicDir) {
  return function serveStatic(requestPath, res) {
    const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
    const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
    const targetPath = path.normalize(path.join(publicDir, relativePath));

    if (!targetPath.startsWith(publicDir)) {
      return sendJson(res, 403, { error: "Forbidden" });
    }

    fs.readFile(targetPath, (error, data) => {
      if (error) {
        return sendJson(res, 404, { error: "Not found" });
      }
      res.writeHead(200, {
        "Content-Type": mimeType(targetPath),
        ...staticCacheHeaders(relativePath)
      });
      res.end(data);
    });
  };
}

function readRequestBody(req, { maxBodyBytes = Infinity } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error("Request body is too large. Please upload a smaller file."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function staticCacheHeaders(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  if (/^home-assets\/cards\/.+\.(?:jpe?g|png|webp|gif|avif)$/i.test(normalized)) {
    return {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "Timing-Allow-Origin": "*"
    };
  }
  if (/^(?:app\.js|styles\.css)$/i.test(normalized)) {
    return {
      "Cache-Control": "no-cache"
    };
  }
  if (/\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(normalized)) {
    return {
      "Cache-Control": "public, max-age=604800"
    };
  }
  return {
    "Cache-Control": "no-cache"
  };
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/mp4"
  }[ext] || "application/octet-stream";
}
