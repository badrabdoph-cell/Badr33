import { SignJWT, jwtVerify } from "jose";
import { nanoid, customAlphabet } from "nanoid";
import { createHmac } from "crypto";
import { ENV } from "./env";

const SHARE_LINK_ISSUER = "badr-photography";
const SHARE_LINK_AUDIENCE = "share-link";
const SHARE_LINK_SUBJECT = "site-share";
const SHARE_CODE_PREFIX = "badrabdoph";
const SHARE_CODE_SIGNATURE_LENGTH = 6;
const SHARE_CODE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const SHARE_CODE_MIN_LENGTH = 3;
const SHARE_CODE_MAX_LENGTH = 8;
const SHARE_CODE_DEFAULT_LENGTH = 4;
const SHARE_CODE_LENGTH = Math.min(
  Math.max(
    Number.parseInt(
      process.env.SHARE_CODE_LENGTH ?? String(SHARE_CODE_DEFAULT_LENGTH),
      10
    ),
    SHARE_CODE_MIN_LENGTH
  ),
  SHARE_CODE_MAX_LENGTH
);
const generateShortCode = customAlphabet(SHARE_CODE_ALPHABET, SHARE_CODE_LENGTH);
const shortCodeRegex = new RegExp(`^[${SHARE_CODE_ALPHABET}]{${SHARE_CODE_MIN_LENGTH},${SHARE_CODE_MAX_LENGTH}}$`);

function getShareLinkSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createShareLink(expiresInMs: number) {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt + expiresInMs);

  const token = await new SignJWT({ jti: nanoid(12) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setIssuer(SHARE_LINK_ISSUER)
    .setAudience(SHARE_LINK_AUDIENCE)
    .setSubject(SHARE_LINK_SUBJECT)
    .sign(getShareLinkSecret());

  return { token, expiresAt };
}

export async function verifyShareLink(token: string) {
  try {
    const { payload } = await jwtVerify(token, getShareLinkSecret(), {
      issuer: SHARE_LINK_ISSUER,
      audience: SHARE_LINK_AUDIENCE,
      subject: SHARE_LINK_SUBJECT,
    });

    const expiresAt =
      typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;

    return { valid: true, expiresAt };
  } catch {
    return { valid: false, expiresAt: null };
  }
}

function signShortPayload(payload: string) {
  const secret = ENV.cookieSecret;
  const digest = createHmac("sha256", secret).update(payload).digest("base64url");
  return digest.slice(0, SHARE_CODE_SIGNATURE_LENGTH);
}

function encodeExpiry(expiresAt: Date) {
  const seconds = Math.floor(expiresAt.getTime() / 1000);
  return seconds.toString(36);
}

function decodeExpiry(encoded: string) {
  const seconds = Number.parseInt(encoded, 36);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}

export function createShortShareCode(expiresInMs: number) {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt + expiresInMs);
  const code = generateShortCode();

  return { code, expiresAt };
}

export function verifyShortShareCode(code: string) {
  if (!code) {
    return { valid: false, expiresAt: null, legacy: false, expired: false };
  }

  if (!code.startsWith(`${SHARE_CODE_PREFIX}-`)) {
    const isValid = shortCodeRegex.test(code);
    return { valid: isValid, expiresAt: null, legacy: false, expired: false };
  }

  const raw = code.slice(SHARE_CODE_PREFIX.length + 1);
  const lastDot = raw.lastIndexOf(".");
  if (lastDot <= 0) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }

  const payload = raw.slice(0, lastDot);
  const signature = raw.slice(lastDot + 1);
  if (!payload || !signature) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }

  const expected = signShortPayload(payload);
  if (signature !== expected) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }

  const [expiryEncoded] = payload.split(".");
  if (!expiryEncoded) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }

  const expiresAt = decodeExpiry(expiryEncoded);
  if (!expiresAt) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }

  if (expiresAt.getTime() <= Date.now()) {
    return { valid: true, expiresAt, legacy: true, expired: true };
  }

  return { valid: true, expiresAt, legacy: true, expired: false };
}
