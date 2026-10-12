import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleUnauthorized, resetSessionState, signInUrl } from "./session";

const at = (pathname: string, search = "") => ({ pathname, search });

describe("handleUnauthorized", () => {
  beforeEach(resetSessionState);

  it("sends the user to sign-in and remembers where they were", () => {
    const go = vi.fn();
    expect(handleUnauthorized(at("/tailor/abc", "?x=1"), go)).toBe(true);
    expect(go).toHaveBeenCalledWith("/sign-in?reason=expired&next=%2Ftailor%2Fabc%3Fx%3D1");
  });

  it("navigates once even when many requests fail together", () => {
    const go = vi.fn();
    handleUnauthorized(at("/resumes"), go);
    handleUnauthorized(at("/resumes"), go);
    handleUnauthorized(at("/resumes"), go);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it.each(["/", "/sign-in", "/sign-up"])("does nothing on the public page %s", (path) => {
    const go = vi.fn();
    expect(handleUnauthorized(at(path), go)).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });

  it("builds a sign-in url that round-trips the destination", () => {
    const url = new URL(signInUrl("/resumes/1", "?tab=export"), "http://x");
    expect(url.searchParams.get("reason")).toBe("expired");
    expect(url.searchParams.get("next")).toBe("/resumes/1?tab=export");
  });
});
