import { Decision, OpName, SectionName, type SuggestionOut } from "@seam/api-client";
import { beforeEach, describe, expect, it } from "vitest";
import { addSuggestion, decide, reset, undo } from "./actions";
import { useReview } from "./store";

function suggestion(id: string, seq: number, extra: Partial<SuggestionOut> = {}): SuggestionOut {
  return {
    id,
    seq,
    op: OpName.ReplaceText,
    section: SectionName.Experience,
    status: Decision.Pending,
    requires_confirmation: false,
    edited_text: null,
    ...extra,
  } as SuggestionOut;
}

function seed(): void {
  reset();
  for (const [i, id] of ["a", "b", "c"].entries()) addSuggestion(suggestion(id, i + 1));
}

describe("review decisions", () => {
  beforeEach(seed);

  it("moves the cursor to the next pending suggestion after a decision", () => {
    expect(useReview.getState().cursor).toBe("a");
    decide("a", Decision.Accepted);
    expect(useReview.getState().cursor).toBe("b");
  });

  it("skips suggestions that are already decided", () => {
    decide("b", Decision.Rejected);
    decide("a", Decision.Accepted);
    expect(useReview.getState().cursor).toBe("c");
  });

  it("returns to the undone suggestion", () => {
    decide("a", Decision.Accepted);
    undo();
    expect(useReview.getState().cursor).toBe("a");
    expect(useReview.getState().suggestions[0]?.status).toBe(Decision.Pending);
  });

  it("asks for confirmation before accepting an unsupported suggestion", () => {
    reset();
    addSuggestion(suggestion("x", 1, { requires_confirmation: true }));
    decide("x", Decision.Accepted);
    expect(useReview.getState().confirming).toBe("x");
    expect(useReview.getState().suggestions[0]?.status).toBe(Decision.Pending);
    decide("x", Decision.Accepted);
    expect(useReview.getState().suggestions[0]?.status).toBe(Decision.Accepted);
  });
});
