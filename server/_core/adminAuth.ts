import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./env";

const ADMIN_COOKIE_NAME = "admin_access";
const ADMIN_SESSION_TTL_MS = Math.min(Math.max(ENV.adminSessionTtlMinutes, 15), 720) * 60 * 1000;
const ADMIN_SESSION_ISSUER = "badr-photography-admin";
const ADMIN_SESSION_AUDIENCE = "admin-panel";
const ADMIN_SESSION_SUBJECT = "admin";
const ADMIN_LOGIN_WINDOW_MS = ENV.adminLoginWindowMs;
const ADMIN_LOGIN_MAX_ATTEMPTS = ENV.adminLoginMaxAttempts;
const ADMIN_LOGIN_BLOCK_MS = ENV.adminLoginBlockMs;

function getAdminSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function matchesAdminCredentials(username: string, password: string) {
  return safeEqual(username, ENV.adminUser) && safeEqual(password, ENV.adminPass);
}

type AdminRateLimitEntry = {
  count: number;
  firstAt: number;
  blockedUntil?: number;
};

const adminLoginAttempts = new Map<string, AdminRateLimitEntry>();

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function isRequestSecure(req: Request) {
  const proto = req.headers["x-forwarded-proto"];
  return req.secure || (typeof proto === "string" && proto.includes("https"));
}

export function checkAdminLoginRateLimit(req: Request) {
  const now = Date.now();
  const ip = getClientIp(req);
  const entry = adminLoginAttempts.get(ip);

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }

  if (!entry || now - entry.firstAt > ADMIN_LOGIN_WINDOW_MS) {
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: ADMIN_LOGIN_BLOCK_MS };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function recordAdminLoginFailure(req: Request) {
  const now = Date.now();
  const ip = getClientIp(req);
  const entry = adminLoginAttempts.get(ip);

  if (!entry || now - entry.firstAt > ADMIN_LOGIN_WINDOW_MS) {
    const next = { count: 1, firstAt: now } as AdminRateLimitEntry;
    if (next.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
      next.blockedUntil = now + ADMIN_LOGIN_BLOCK_MS;
    }
    adminLoginAttempts.set(ip, next);
    return next;
  }

  entry.count += 1;
  if (entry.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = now + ADMIN_LOGIN_BLOCK_MS;
  }
  adminLoginAttempts.set(ip, entry);
  return entry;
}

export function clearAdminLoginFailures(req: Request) {
  const ip = getClientIp(req);
  adminLoginAttempts.delete(ip);
}

export function getAdminLoginBackoffMs(attemptCount: number) {
  const base = 350;
  const delay = base + Math.min(attemptCount * 250, 2000);
  return Math.max(0, delay);
}

export async function createAdminSession(expiresInMs = ADMIN_SESSION_TTL_MS) {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt + expiresInMs);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setIssuer(ADMIN_SESSION_ISSUER)
    .setAudience(ADMIN_SESSION_AUDIENCE)
    .setSubject(ADMIN_SESSION_SUBJECT)
    .sign(getAdminSecret());

  return { token, expiresAt };
}

export async function verifyAdminSession(token: string | undefined | null) {
  if (!token) return { valid: false, expiresAt: null };
  try {
    const { payload } = await jwtVerify(token, getAdminSecret(), {
      issuer: ADMIN_SESSION_ISSUER,
      audience: ADMIN_SESSION_AUDIENCE,
      subject: ADMIN_SESSION_SUBJECT,
    });

    const expiresAt =
      typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;

    return { valid: true, expiresAt };
  } catch {
    return { valid: false, expiresAt: null };
  }
}

function getAdminCookieOptions(req: Request) {
  const isSecure = isRequestSecure(req) || ENV.isProduction;
  const sameSite: "strict" | "lax" = isSecure ? "strict" : "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: isSecure,
  };
}

export function setAdminSessionCookie(
  req: Request,
  res: Response,
  token: string,
  expiresInMs = ADMIN_SESSION_TTL_MS
) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...getAdminCookieOptions(req),
    maxAge: expiresInMs,
  });
}

export function clearAdminSessionCookie(req: Request, res: Response) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    ...getAdminCookieOptions(req),
    maxAge: -1,
  });
}

export async function getAdminSessionFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const token = cookies[ADMIN_COOKIE_NAME];
  return await verifyAdminSession(token);
}
