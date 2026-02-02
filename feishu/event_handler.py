import logging
from django.conf import settings

from feishu.services import FeishuUserSyncService
from accounts.models import User, Account


logger = logging.getLogger(__name__)


class FeishuEventHandler:
    def __init__(self):
        self.verification_token = getattr(settings, "FEISHU_VERIFICATION_TOKEN", "")
        self.encrypt_key = getattr(settings, "FEISHU_ENCRYPT_KEY", "")
        self.sync_service = FeishuUserSyncService()

    def verify_event(self, event_data):
        token = event_data.get("token") or event_data.get("header", {}).get("token", "")
        if not self.verification_token:
            return True

        return token == self.verification_token

    def handle_event(self, event_data):
        try:
            event = event_data.get("event")
            if event:
                event_type = event.get("type", "")
                tenant_key = event_data.get("tenant_key") or event.get(
                    "header", {}
                ).get("tenant_key", "")

                if not self.verify_event(event_data):
                    logger.warning(
                        f"Event verification failed: {event.get('token') or event_data.get('header', {}).get('token')}"
                    )
                    return {"success": False, "error": "Invalid token"}

                logger.info(f"Received Feishu event: {event_type}")

                handler_map = {
                    "user_add": self.handle_user_add,
                    "user_update": self.handle_user_update,
                    "user_leave": self.handle_user_leave,
                    "department_create": self.handle_department_create,
                    "department_update": self.handle_department_update,
                }

                handler = handler_map.get(event_type)
                if handler:
                    return handler(event, tenant_key)
                else:
                    logger.warning(f"Unknown event type: {event_type}")
                    return {"success": True, "message": "Event ignored"}
            else:
                event_type = event_data.get("event_type", "")
                tenant_key = event_data.get("tenant_key") or event_data.get(
                    "header", {}
                ).get("tenant_key", "")

                if not self.verify_event(event_data):
                    logger.warning(
                        f"Event verification failed: {event_data.get('token') or event_data.get('header', {}).get('token')}"
                    )
                    return {"success": False, "error": "Invalid token"}

                logger.info(f"Received Feishu event (direct): {event_type}")

                handler_map = {
                    "user_add": self.handle_user_add,
                    "user_update": self.handle_user_update,
                    "user_leave": self.handle_user_leave,
                    "department_create": self.handle_department_create,
                    "department_update": self.handle_department_update,
                }

                handler = handler_map.get(event_type)
                if handler:
                    return handler(event_data, tenant_key)
                else:
                    logger.warning(f"Unknown event type: {event_type}")
                    return {"success": True, "message": "Event ignored"}

        except Exception as e:
            logger.error(f"Error handling Feishu event: {e}")
            return {"success": False, "error": str(e)}

    def handle_user_add(self, event, tenant_key):
        logger.info("Handling user_add event")
        user_data = event.get("object", {}).get("user") or event.get("user")
        account = self._get_account(tenant_key)

        if user_data and user_data.get("user_id"):
            user = self.sync_service.sync_user_from_feishu(user_data, account=account)
            if user:
                logger.info(f"User created/updated from Feishu: {user.username}")
                return {
                    "success": True,
                    "action": "user_synced",
                    "user_id": str(user.id),
                }
            else:
                return {"success": False, "error": "Failed to sync user"}

        return {"success": True, "message": "No user data in event"}

    def handle_user_update(self, event, tenant_key):
        logger.info("Handling user_update event")
        user_data = event.get("object", {}).get("user") or event.get("user")
        account = self._get_account(tenant_key)

        if user_data and user_data.get("user_id"):
            user = self.sync_service.sync_user_from_feishu(user_data, account=account)
            if user:
                logger.info(f"User updated from Feishu: {user.username}")
                return {
                    "success": True,
                    "action": "user_updated",
                    "user_id": str(user.id),
                }
            else:
                return {"success": False, "error": "Failed to sync user"}

        return {"success": True, "message": "No user data in event"}

    def handle_user_leave(self, event, tenant_key):
        logger.info("Handling user_leave event")
        user_data = event.get("object", {}).get("user") or event.get("user")
        user_id = user_data.get("user_id")
        open_id = user_data.get("open_id")

        if not user_id and not open_id:
            return {"success": True, "message": "No user identifier in event"}

        user = None
        if user_id:
            user = User.objects.filter(feishu_user_id=user_id).first()
        if not user and open_id:
            user = User.objects.filter(feishu_open_id=open_id).first()

        if user:
            user.is_active = False
            user.save()
            logger.info(f"User deactivated from Feishu: {user.username}")
            return {
                "success": True,
                "action": "user_deactivated",
                "user_id": str(user.id),
            }
        else:
            return {"success": True, "message": "User not found"}

    def handle_department_create(self, event, tenant_key):
        logger.info("Handling department_create event")
        dept_data = event.get("object", {}).get("department") or event.get("department")
        account = self._get_account(tenant_key)

        if account and account.pk:
            department_id = dept_data.get("department_id")
            department_name = dept_data.get("name")

            if not department_id:
                return {"success": True, "message": "No department_id in event"}

            if "feishu_departments" not in account.settings:
                account.settings["feishu_departments"] = {}

            account.settings["feishu_departments"][department_id] = department_name
            account.save(update_fields=["settings"])
            logger.info(f"Department added: {department_id} - {department_name}")
            return {
                "success": True,
                "action": "department_added",
                "department_id": department_id,
            }

        return {"success": True, "message": "No account found or account.pk missing"}

    def handle_department_update(self, event, tenant_key):
        logger.info("Handling department_update event")
        dept_data = event.get("object", {}).get("department") or event.get("department")
        account = self._get_account(tenant_key)

        if account and account.pk:
            department_id = dept_data.get("department_id")
            department_name = dept_data.get("name")

            if not department_id:
                return {"success": True, "message": "No department_id in event"}

            if "feishu_departments" not in account.settings:
                account.settings["feishu_departments"] = {}

            account.settings["feishu_departments"][department_id] = department_name
            account.save(update_fields=["settings"])
            logger.info(f"Department updated: {department_id} - {department_name}")
            return {
                "success": True,
                "action": "department_updated",
                "department_id": department_id,
            }

        return {"success": True, "message": "No account found or account.pk missing"}

    def _get_account(self, tenant_key):
        if tenant_key:
            account = Account.objects.filter(feishu_tenant_key=tenant_key).first()
            if account:
                return account

        return Account.objects.filter(is_active=True).first()
