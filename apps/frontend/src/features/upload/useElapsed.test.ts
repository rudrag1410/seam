import { describe, expect, it } from "vitest";
import { readingStatus } from "./useElapsed";

describe("readingStatus", () => {
  it("moves from upload to reading to a slow-server notice", () => {
    expect(readingStatus(0).title).toMatch(/Uploading/);
    expect(readingStatus(10).title).toMatch(/Reading/);
    expect(readingStatus(40).title).toMatch(/Still working/);
  });
});
