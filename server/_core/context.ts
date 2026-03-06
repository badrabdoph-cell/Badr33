import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getAdminSessionFromRequest } from "./adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminAccess: boolean;
  adminExpiresAt: Date | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let adminAccess = false;
  let adminExpiresAt: Date | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    const adminSession = await getAdminSessionFromRequest(opts.req);
    adminAccess = adminSession.valid;
    adminExpiresAt = adminSession.expiresAt;
  } catch {
    adminAccess = false;
    adminExpiresAt = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminAccess,
    adminExpiresAt,
  };
}
