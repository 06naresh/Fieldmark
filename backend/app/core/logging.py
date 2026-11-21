import json
import logging
import sys
from datetime import datetime, timezone

_STANDARD_LOG_RECORD_FIELDS = {
    "args",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "taskName",
    "thread",
    "threadName",
}

_LOG_HANDLER_NAME = "fieldmark_structured_json"


class JsonFormatter(logging.Formatter):
    """Render log records as stable, machine-readable JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key, value in record.__dict__.items():
            if key not in _STANDARD_LOG_RECORD_FIELDS and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, separators=(",", ":"))


def setup_logging(level: str = "INFO") -> None:
    """Configure root JSON logging without removing pytest-owned handlers."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())

    for existing_handler in list(root_logger.handlers):
        if existing_handler.name == _LOG_HANDLER_NAME:
            root_logger.removeHandler(existing_handler)
            existing_handler.close()

    handler = logging.StreamHandler(sys.stdout)
    handler.set_name(_LOG_HANDLER_NAME)
    handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
