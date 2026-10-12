# 3. In-process, replayable event log instead of Redis + a worker

**Status:** accepted for v1, revisit before scaling out

## Context
Generation takes several seconds and should survive a page refresh. The usual answer is a queue, a worker and Redis Streams relayed over SSE.

## Decision
Generation runs as a background task in the API process. Events go to an in-memory log per session and are relayed over SSE with `Last-Event-ID` resume. Suggestions are persisted as they arrive, so once a run is over a refresh replays from the database. `TailorBroker` exposes `publish`, `finish` and `subscribe`, the same contract a Redis Streams implementation would have.

## Consequences
- No extra infrastructure for a free-tier deploy, and refresh-safe.
- A restart mid-generation fails that session (the user retries; inputs are saved), and multiple API instances would not share streams. Swap `TailorBroker` for Redis Streams and move the pipeline into an arq worker when that matters.
