import asyncio
import logging
from typing import Callable

logger = logging.getLogger(__name__)


class EventBus:
    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._subscribers: dict[str, list[Callable]] = {}

    async def publish(self, event_name: str, payload: dict):
        await self._queue.put({"event": event_name, "payload": payload})

    def subscribe(self, event_name: str, handler: Callable):
        self._subscribers.setdefault(event_name, []).append(handler)

    async def process(self):
        while True:
            event = await self._queue.get()
            for handler in self._subscribers.get(event["event"], []):
                try:
                    await handler(event["payload"])
                except Exception:
                    logger.exception("Event handler failed for event %s", event["event"])


event_bus = EventBus()
