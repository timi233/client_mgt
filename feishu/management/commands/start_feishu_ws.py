import logging
import signal
import sys

from django.core.management.base import BaseCommand

from feishu.client import FeishuAPIClient
from feishu.event_handler import FeishuEventHandler
from feishu.websocket_client import FeishuWebSocketClient


class Command(BaseCommand):
    help = "Start Feishu WebSocket long connection for event streaming"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = None

    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )

    def handle(self, *args, **options):
        self.setup_logging()

        logger = logging.getLogger(__name__)
        logger.info("Starting Feishu WebSocket client...")

        api_client = FeishuAPIClient()
        event_handler = FeishuEventHandler()
        self.client = FeishuWebSocketClient(api_client, event_handler)

        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

        try:
            self.client.run()
        except KeyboardInterrupt:
            logger.info("Received KeyboardInterrupt, stopping...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            sys.exit(1)
        finally:
            self.stop_client()

    def _handle_signal(self, signum, frame):
        logger = logging.getLogger(__name__)
        logger.info(f"Received signal {signum}, stopping...")
        self.stop_client()
        sys.exit(0)

    def stop_client(self):
        if self.client:
            self.client.stop()
