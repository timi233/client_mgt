import logging
from typing import Optional

import lark_oapi as lark
from django.conf import settings

from feishu.event_handler import FeishuEventHandler


logger = logging.getLogger(__name__)


class FeishuWebSocketClient:
    def __init__(self, api_client=None, event_handler=None):
        self.event_handler = event_handler or FeishuEventHandler()
        app_id = getattr(settings, "FEISHU_APP_ID", "")
        app_secret = getattr(settings, "FEISHU_APP_SECRET", "")

        event_dispatcher = (
            lark.EventDispatcherHandler.builder("", "")
            .register_p2_contact_user_created_v3(self._handle_user_add)
            .register_p2_contact_user_updated_v3(self._handle_user_update)
            .register_p2_contact_user_deleted_v3(self._handle_user_leave)
            .register_p2_contact_department_created_v3(self._handle_department_create)
            .register_p2_contact_department_updated_v3(self._handle_department_update)
            .build()
        )

        self.client = lark.ws.Client(
            app_id=app_id,
            app_secret=app_secret,
            event_handler=event_dispatcher,
            log_level=lark.LogLevel.DEBUG,
        )

    def _handle_user_add(self, data):
        logger.info("Received user.add_v1 event")
        event_data = self._convert_event_data(data, "user_add")
        result = self.event_handler.handle_event(event_data)
        logger.info(f"User add event handled: {result}")
        return result

    def _handle_user_update(self, data):
        logger.info("Received user.update_v1 event")
        event_data = self._convert_event_data(data, "user_update")
        result = self.event_handler.handle_event(event_data)
        logger.info(f"User update event handled: {result}")
        return result

    def _handle_user_leave(self, data):
        logger.info("Received user.leave_v1 event")
        event_data = self._convert_event_data(data, "user_leave")
        result = self.event_handler.handle_event(event_data)
        logger.info(f"User leave event handled: {result}")
        return result

    def _handle_department_create(self, data):
        logger.info("Received department.create_v1 event")
        event_data = self._convert_event_data(data, "department_create")
        result = self.event_handler.handle_event(event_data)
        logger.info(f"Department create event handled: {result}")
        return result

    def _handle_department_update(self, data):
        logger.info("Received department.update_v1 event")
        event_data = self._convert_event_data(data, "department_update")
        result = self.event_handler.handle_event(event_data)
        logger.info(f"Department update event handled: {result}")
        return result

    def _convert_event_data(self, data, event_type):
        event_data = {
            "event_type": event_type,
            "tenant_key": data.get("tenant_key", ""),
        }

        if hasattr(data, "event"):
            event_data["event"] = {
                "type": event_type,
                "object": {
                    "user": getattr(data.event, "user", None)
                    if hasattr(data.event, "user")
                    else None,
                    "department": getattr(data.event, "department", None)
                    if hasattr(data.event, "department")
                    else None,
                },
            }
            if hasattr(data.event, "user") and data.event.user:
                event_data["user"] = {
                    "user_id": getattr(data.event.user, "user_id", ""),
                    "open_id": getattr(data.event.user, "open_id", ""),
                    "name": getattr(data.event.user, "name", ""),
                    "email": getattr(data.event.user, "email", ""),
                }
            if hasattr(data.event, "department") and data.event.department:
                event_data["department"] = {
                    "department_id": getattr(
                        data.event.department, "department_id", ""
                    ),
                    "name": getattr(data.event.department, "name", ""),
                }

        return event_data

    def run(self):
        logger.info("Starting Feishu WebSocket client...")
        try:
            self.client.start()
        except Exception as e:
            logger.error(f"WebSocket client error: {e}")
            raise

    def stop(self):
        logger.info("Stopping Feishu WebSocket client...")
        try:
            self.client.stop()
        except Exception as e:
            logger.error(f"Error stopping WebSocket client: {e}")
            raise
