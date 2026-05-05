import { randomUUID } from "node:crypto";

const COOKIE_NAME = "thoughtgrid_visitor";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const VISITOR_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

export function resolveVisitor(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  let visitorId = cookies[COOKIE_NAME];
  if (!VISITOR_PATTERN.test(visitorId || "")) {
    visitorId = `v_${randomUUID()}`;
    res.setHeader("Set-Cookie", buildCookie(req, visitorId));
  }
  return { visitorId };
}

function parseCookies(header) {
  const result = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;
    result[name] = decodeURIComponent(value);
  }
  return result;
}

function buildCookie(req, visitorId) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(visitorId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`
  ];
  if (proto === "https") parts.push("Secure");
  return parts.join("; ");
}
