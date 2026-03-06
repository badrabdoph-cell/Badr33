const DEFAULT_ADMIN_USER = "change-me";
const DEFAULT_ADMIN_PASS = "change-me";
const DEFAULT_COOKIE_SECRET = "local-admin-secret";

const isProduction = process.env.NODE_ENV === "production";

const adminUser = process.env.ADMIN_USER ?? DEFAULT_ADMIN_USER;
const adminPass = process.env.ADMIN_PASS ?? DEFAULT_ADMIN_PASS;
const cookieSecret = process.env.JWT_SECRET ?? DEFAULT_COOKIE_SECRET;
const adminBypass = (process.env.ADMIN_BYPASS ?? "false") === "true";
const adminAllowDefaults = (process.env.ADMIN_ALLOW_DEFAULTS ?? "false") === "true";
const adminForceEnable = (process.env.ADMIN_LOGIN_FORCE_ENABLE ?? "false") === "true";

const adminSessionTtlMinutes = Number.parseInt(process.env.ADMIN_SESSION_TTL_MINUTES ?? "120", 10);
const adminLoginWindowMs = Number.parseInt(process.env.ADMIN_LOGIN_WINDOW_MS ?? "600000", 10);
const adminLoginMaxAttempts = Number.parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS ?? "5", 10);
const adminLoginBlockMs = Number.parseInt(process.env.ADMIN_LOGIN_BLOCK_MS ?? "1800000", 10);
const adminRequireHttps =
  (process.env.ADMIN_REQUIRE_HTTPS ??
    (isProduction ? "true" : "false")) === "true";

const hasAdminEnv = Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASS);
const usingDefaultAdmin = adminUser === DEFAULT_ADMIN_USER && adminPass === DEFAULT_ADMIN_PASS;

const adminEnvIssues: string[] = [];
if (isProduction) {
  if (!hasAdminEnv && !adminAllowDefaults) {
    adminEnvIssues.push("ADMIN_USER/ADMIN_PASS غير محددين");
  }
  if (!adminAllowDefaults && usingDefaultAdmin) {
    adminEnvIssues.push("بيانات الأدمن الافتراضية غير مسموحة");
  }
  if (!process.env.JWT_SECRET || cookieSecret === DEFAULT_COOKIE_SECRET) {
    adminEnvIssues.push("JWT_SECRET غير محدد بقيمة قوية");
  }
  if (adminBypass) {
    adminEnvIssues.push("ADMIN_BYPASS مفعّل");
  }
}

const adminLoginDisabled = isProduction && adminEnvIssues.length > 0 && !adminForceEnable;
if (adminEnvIssues.length > 0) {
  console.warn(
    `[Admin] تحذير إعدادات: ${adminEnvIssues.join(", ")}`
  );
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "local-admin-app",
  cookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminBypass,
  adminUser,
  adminPass,
  adminSessionTtlMinutes: Number.isFinite(adminSessionTtlMinutes) && adminSessionTtlMinutes > 0
    ? adminSessionTtlMinutes
    : 120,
  adminLoginWindowMs: Number.isFinite(adminLoginWindowMs) && adminLoginWindowMs > 0
    ? adminLoginWindowMs
    : 600000,
  adminLoginMaxAttempts: Number.isFinite(adminLoginMaxAttempts) && adminLoginMaxAttempts > 0
    ? adminLoginMaxAttempts
    : 5,
  adminLoginBlockMs: Number.isFinite(adminLoginBlockMs) && adminLoginBlockMs > 0
    ? adminLoginBlockMs
    : 1800000,
  adminRequireHttps,
  adminLoginDisabled,
  adminEnvIssues,
};
