import threading
import time
from collections import OrderedDict, deque

from app.core.config import settings
from app.core.exceptions import RateLimitError


class InMemoryLoginRateLimiter:
    """Bounded, process-local limiter for failed login attempts."""

    def __init__(
        self,
        max_attempts: int,
        window_seconds: int,
        max_keys: int,
        failure_message: str = "Too many failed login attempts. Please try again later.",
    ) -> None:
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._max_keys = max_keys
        self._failure_message = failure_message
        self._buckets: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        with self._lock:
            failures = self._buckets.get(key)
            if not failures:
                return

            now = time.monotonic()
            self._prune(failures, now)
            if len(failures) >= self._max_attempts:
                raise RateLimitError(self._failure_message)
            if not failures:
                self._buckets.pop(key, None)

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._ensure_capacity(key)
            failures = self._buckets.setdefault(key, deque())
            self._prune(failures, time.monotonic())
            failures.append(time.monotonic())
            self._buckets.move_to_end(key)

    def reset(self, key: str) -> None:
        with self._lock:
            self._buckets.pop(key, None)

    def _prune(self, failures: deque[float], now: float) -> None:
        cutoff = now - self._window_seconds
        while failures and failures[0] <= cutoff:
            failures.popleft()

    def _ensure_capacity(self, key: str) -> None:
        if key in self._buckets or len(self._buckets) < self._max_keys:
            return
        oldest_key = next(iter(self._buckets))
        self._buckets.pop(oldest_key, None)


login_rate_limiter = InMemoryLoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    max_keys=settings.LOGIN_RATE_LIMIT_MAX_KEYS,
)

# Public signup is rate limited independently from login so repeated duplicate
# registrations cannot be used to exhaust the login limiter, and vice versa.
signup_rate_limiter = InMemoryLoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    max_keys=settings.LOGIN_RATE_LIMIT_MAX_KEYS,
    failure_message="Too many signup attempts. Please try again later.",
)
