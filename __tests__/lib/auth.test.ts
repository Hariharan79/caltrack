jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

import { validateAuthDraft, hasErrors } from "@/lib/auth";

describe("validateAuthDraft", () => {
  it("flags empty email + password", () => {
    const errors = validateAuthDraft({ email: "", password: "" });
    expect(errors.email).toBe("Required");
    expect(errors.password).toBe("Required");
  });

  it("flags malformed email", () => {
    const errors = validateAuthDraft({ email: "not-an-email", password: "abcdef" });
    expect(errors.email).toBe("Not a valid email");
    expect(errors.password).toBeUndefined();
  });

  it("flags short password", () => {
    const errors = validateAuthDraft({ email: "a@b.co", password: "abc" });
    expect(errors.email).toBeUndefined();
    expect(errors.password).toBe("At least 6 characters");
  });

  it("accepts valid inputs", () => {
    const errors = validateAuthDraft({ email: " a@b.co ", password: "abcdef" });
    expect(errors).toEqual({});
  });

  it("trims email before validation", () => {
    const errors = validateAuthDraft({ email: "  x@y.z  ", password: "abcdef" });
    expect(errors.email).toBeUndefined();
  });
});

describe("hasErrors", () => {
  it("returns false for empty object", () => {
    expect(hasErrors({})).toBe(false);
  });

  it("returns true when any field has an error", () => {
    expect(hasErrors({ email: "Required" })).toBe(true);
    expect(hasErrors({ password: "Required" })).toBe(true);
  });
});
