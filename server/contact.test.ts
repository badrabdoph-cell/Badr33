import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("contact.submit", () => {
  it("accepts valid contact form submission", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit({
      name: "أحمد محمد",
      phone: "01011511561",
      date: "2026-03-15",
      message: "أريد حجز جلسة تصوير زفاف",
    });

    expect(result).toEqual({
      success: true,
      notificationSent: true,
    });
  });

  it("accepts submission without optional message", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit({
      name: "سارة أحمد",
      phone: "01234567890",
      date: "2026-04-20",
    });

    expect(result).toEqual({
      success: true,
      notificationSent: true,
    });
  });

  it("rejects submission with short name", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({
        name: "أ",
        phone: "01011511561",
        date: "2026-03-15",
      })
    ).rejects.toThrow();
  });

  it("rejects submission with invalid phone", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({
        name: "أحمد محمد",
        phone: "123",
        date: "2026-03-15",
      })
    ).rejects.toThrow();
  });
});
