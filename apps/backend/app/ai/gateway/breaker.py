import time


class CircuitBreaker:
    """Opens after `threshold` failures inside `window_s`, stays open for `cooldown_s`."""

    def __init__(self, threshold: int = 5, window_s: float = 30, cooldown_s: float = 60) -> None:
        self.threshold = threshold
        self.window_s = window_s
        self.cooldown_s = cooldown_s
        self._failures: list[float] = []
        self._opened_at: float | None = None

    @property
    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        if time.monotonic() - self._opened_at >= self.cooldown_s:
            self._opened_at = None
            self._failures.clear()
            return False
        return True

    def record_success(self) -> None:
        self._failures.clear()

    def record_failure(self) -> None:
        now = time.monotonic()
        self._failures = [t for t in self._failures if now - t < self.window_s] + [now]
        if len(self._failures) >= self.threshold:
            self._opened_at = now
