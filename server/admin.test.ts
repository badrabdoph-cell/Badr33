import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Admin API - Site Content", () => {
  it("allows public access to get all site content", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw - public access allowed
    const result = await caller.siteContent.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin users from upserting content", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.siteContent.upsert({
        key: "test_key",
        value: "test_value",
        category: "test",
      })
    ).rejects.toThrow();
  });
});

describe("Admin API - Portfolio", () => {
  it("allows public access to get all portfolio images", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.portfolio.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin users from creating portfolio images", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.portfolio.create({
        title: "Test Image",
        url: "https://example.com/image.jpg",
        category: "wedding",
      })
    ).rejects.toThrow();
  });

  it("denies non-admin users from deleting portfolio images", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.portfolio.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("Admin API - Packages", () => {
  it("allows public access to get all packages", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.packages.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin users from creating packages", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.packages.create({
        name: "Test Package",
        price: "$500",
        category: "session",
      })
    ).rejects.toThrow();
  });
});

describe("Admin API - Testimonials", () => {
  it("allows public access to get all testimonials", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.testimonials.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin users from creating testimonials", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.testimonials.create({
        name: "Test Client",
        quote: "Great service!",
      })
    ).rejects.toThrow();
  });
});

describe("Admin API - Contact Info", () => {
  it("allows public access to get all contact info", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contactInfo.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin users from upserting contact info", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contactInfo.upsert({
        key: "phone",
        value: "123456789",
      })
    ).rejects.toThrow();
  });
});

describe("Admin API - Sections", () => {
  it("allows public access to get all sections", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sections.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin users from toggling section visibility", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sections.toggleVisibility({
        key: "hero",
        visible: false,
      })
    ).rejects.toThrow();
  });
});
