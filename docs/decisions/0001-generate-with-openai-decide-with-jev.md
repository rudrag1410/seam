# 1. Generate with OpenAI, decide with Jev

**Status:** accepted

## Context
A tailoring tool is only useful if users can trust it not to invent experience. A single model that both writes a bullet and judges whether it is true tends to agree with itself.

## Decision
OpenAI does the writing (structuring, rewriting, drafting). TypeSafe Jev makes the typed decisions around that writing: is this a JD, how well does the resume cover each requirement, is this rewrite supported by the evidence, did it improve on the original. Each Jev answer carries a calibrated confidence, and code acts on bands (high acts automatically, medium shows a "check this" tag, low is never trusted).

Every Jev decision has a deterministic fallback (keyword coverage, string-level fabrication guard). Jev being unavailable lowers quality ("basic mode") but never blocks the user.

## Consequences
- A different model checks the writer, and scoring is explainable: Jev rates each requirement, code applies the weights.
- Two vendors on the critical path, mitigated by the fallbacks. Thresholds are tuned per pinned Jev version, so upgrading the pin means re-running the evals first.
