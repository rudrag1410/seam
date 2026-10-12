import asyncio
import re
import statistics
import sys
import time
from pathlib import Path

from app.ai.gateway import build_gateway
from app.ai.pipelines.analyze_jd import analyze_jd
from app.ai.pipelines.tailor import TailorInputs, run_tailor
from app.ai.scoring.keywords import find_keywords, resume_text
from app.core.config import get_settings
from app.core.errors import AppError
from app.parsing.heuristic import heuristic_parse
from app.parsing.ids import build_resume

FIXTURES = Path(__file__).resolve().parents[3] / "packages" / "fixtures"
BANNED = ("passionate", "results-driven", "synergy", "team player", "go-getter")
MAX_WORDS = 28
NUMBER = re.compile(r"\d[\d,.]*\s?%?")

GATES = {"unflagged_new_claims": ("==", 0), "banned_phrases": ("==", 0), "median_lift": (">=", 0.0)}


async def evaluate() -> int:
    settings = get_settings()
    ai = build_gateway(settings)
    rows, failures = [], []
    for resume_path in sorted((FIXTURES / "resumes").glob("*.txt")):
        text = resume_path.read_text()
        resume = build_resume(heuristic_parse(text)).model_dump()
        for jd_path in sorted((FIXTURES / "jds").glob("*.txt")):
            label = f"{resume_path.stem} x {jd_path.stem}"
            jd_text = jd_path.read_text()
            started = time.perf_counter()
            try:
                analysis = (await analyze_jd(ai, settings, jd_text)).analysis
                inp = TailorInputs(
                    resume=resume,
                    jd=analysis,
                    sections=["summary", "skills", "experience"],
                    intensity="balanced",
                )
                suggestions, before, projected, first = [], 0.0, 0.0, None
                async for ev in run_tailor(ai, settings, inp):
                    if ev["event"] == "suggestion":
                        first = first or time.perf_counter() - started
                        suggestions.append(ev["data"])
                    elif ev["event"] == "score":
                        before = ev["data"]["before"]["total"]
                        projected = ev["data"].get("projected", {}).get("total", projected)
            except AppError as exc:
                failures.append(f"{label}: {exc.code}")
                continue

            known = set(find_keywords(resume_text(resume)))
            known_numbers = {m.group().strip() for m in NUMBER.finditer(resume_text(resume))}
            unflagged, banned = 0, 0
            for s in suggestions:
                new_text = str(s["payload"].get("after") or s["payload"].get("value") or "")
                invented = (set(find_keywords(new_text)) - known) or {
                    m.group().strip() for m in NUMBER.finditer(new_text)
                } - known_numbers
                if invented and not s["requires_confirmation"]:
                    unflagged += 1
                banned += sum(p in new_text.lower() for p in BANNED)
                if s["op"] == "replace_text" and len(new_text.split()) > MAX_WORDS:
                    banned += 1
            rows.append(
                {
                    "pair": label,
                    "n": len(suggestions),
                    "unflagged": unflagged,
                    "banned": banned,
                    "lift": projected - before,
                    "ttfs": first,
                }
            )

    if not rows:
        print("\nNo pairs completed, so there is nothing to gate on.")
        for f in failures:
            print(f"  FAIL  {f}")
        print("Set OPENAI_API_KEY for live evals, or AI_MODE=mock for the offline stand-in.")
        return 1

    print(f"\n{'pair':44} {'sugg':>5} {'unflagged':>10} {'concision':>10} {'lift':>6} {'ttfs':>6}")
    for r in rows:
        ttfs = f"{r['ttfs']:.1f}s" if r["ttfs"] is not None else "-"
        print(
            f"{r['pair']:44} {r['n']:>5} {r['unflagged']:>10} {r['banned']:>10} {r['lift']:>+6.1f} {ttfs:>6}"
        )

    lifts = [r["lift"] for r in rows]
    summary = {
        "unflagged_new_claims": sum(r["unflagged"] for r in rows),
        "banned_phrases": sum(r["banned"] for r in rows),
        "median_lift": statistics.median(lifts) if lifts else 0.0,
    }
    print("\nGates")
    for name, (op, bound) in GATES.items():
        value = summary[name]
        ok = value == bound if op == "==" else value >= bound
        print(f"  {'PASS' if ok else 'FAIL'}  {name} {op} {bound}  (got {value:g})")
        if not ok:
            failures.append(name)
    for f in failures:
        print(f"  FAIL  {f}")
    return 1 if failures else 0


def main() -> None:
    sys.exit(asyncio.run(evaluate()))


if __name__ == "__main__":
    main()
