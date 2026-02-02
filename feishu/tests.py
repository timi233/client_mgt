import json
from unittest.mock import Mock, patch, MagicMock

from django.test import TestCase, override_settings
from django.core.cache import cache

from accounts.models import User, Account
from feishu.client import FeishuAPIClient
from feishu.services import FeishuUserSyncService
from feishu.websocket_client import FeishuWebSocketClient


class FeishuAPIClientTest(TestCase):
    def setUp(self):
        self.client = FeishuAPIClient()
        cache.clear()

    @patch("feishu.client.requests.post")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_get_tenant_access_token(self, mock_post):
        mock_response = Mock()
        mock_response.json.return_value = {
            "code": 0,
            "tenant_access_token": "test_token",
            "expire": 7200,
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        token = self.client.get_tenant_access_token()
        self.assertEqual(token, "test_token")
        mock_post.assert_called_once()

    @patch("feishu.client.cache.get")
    @patch("feishu.client.cache.set")
    @patch("feishu.client.requests.post")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_get_tenant_access_token_with_cache(self, mock_post, mock_set, mock_get):
        mock_get.return_value = "cached_token"

        token = self.client.get_tenant_access_token()
        self.assertEqual(token, "cached_token")
        mock_post.assert_not_called()

    @patch("feishu.client.requests.request")
    @patch.object(FeishuAPIClient, "get_tenant_access_token")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_get_user_info(self, mock_get_token, mock_request):
        mock_get_token.return_value = "test_token"
        mock_response = Mock()
        mock_response.json.return_value = {
            "code": 0,
            "data": {
                "user": {
                    "user_id": "test_user_id",
                    "open_id": "test_open_id",
                    "name": "Test User",
                }
            },
        }
        mock_response.raise_for_status = Mock()
        mock_request.return_value = mock_response

        result = self.client.get_user_info("test_user_id")
        self.assertEqual(result["code"], 0)
        mock_request.assert_called_once()

    @patch("feishu.client.requests.request")
    @patch.object(FeishuAPIClient, "get_tenant_access_token")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_send_message(self, mock_get_token, mock_request):
        mock_get_token.return_value = "test_token"
        mock_response = Mock()
        mock_response.json.return_value = {
            "code": 0,
            "data": {"message_id": "test_message_id"},
        }
        mock_response.raise_for_status = Mock()
        mock_request.return_value = mock_response

        result = self.client.send_message(
            receive_id="test_user_id", msg_type="text", content={"text": "Test message"}
        )
        self.assertEqual(result["code"], 0)
        mock_request.assert_called_once()


class FeishuUserSyncServiceTest(TestCase):
    def setUp(self):
        self.service = FeishuUserSyncService()
        self.account = Account.objects.create(name="Test Account")

    def test_sync_user_from_feishu(self):
        user_data = {
            "open_id": "test_open_id",
            "user_id": "test_user_id",
            "union_id": "test_union_id",
            "name": "Test User",
            "email": "test@example.com",
            "mobile": "13800138000",
            "department_ids": ["dept_001"],
            "is_active": True,
        }

        user = self.service.sync_user_from_feishu(user_data, account=self.account)

        self.assertIsNotNone(user)
        self.assertEqual(user.feishu_open_id, "test_open_id")
        self.assertEqual(user.feishu_user_id, "test_user_id")
        self.assertEqual(user.display_name, "Test User")
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.account, self.account)

    def test_sync_user_from_feishu_update_existing(self):
        user_data = {
            "open_id": "test_open_id",
            "user_id": "test_user_id",
            "name": "Original Name",
            "email": "original@example.com",
        }

        user = self.service.sync_user_from_feishu(user_data, account=self.account)
        self.assertEqual(user.display_name, "Original Name")

        updated_user_data = {
            "open_id": "test_open_id",
            "user_id": "test_user_id",
            "name": "Updated Name",
            "email": "updated@example.com",
        }

        updated_user = self.service.sync_user_from_feishu(
            updated_user_data, account=self.account
        )
        self.assertEqual(updated_user.id, user.id)
        self.assertEqual(updated_user.display_name, "Updated Name")

    def test_sync_user_from_feishu_no_identifier(self):
        user_data = {"name": "Test User"}

        user = self.service.sync_user_from_feishu(user_data, account=self.account)
        self.assertIsNone(user)


class FeishuWebSocketClientTest(TestCase):
    @patch("feishu.websocket_client.lark.ws.Client")
    @patch("feishu.websocket_client.lark.EventDispatcherHandler.builder")
    @patch("feishu.websocket_client.FeishuEventHandler")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_websocket_connection(self, mock_handler, mock_builder, mock_client):
        mock_event_handler = Mock()
        mock_handler.return_value = mock_event_handler

        mock_dispatcher_builder = Mock()
        mock_builder.return_value = mock_dispatcher_builder

        mock_dispatcher = Mock()
        mock_dispatcher_builder.register_p2_contact_user_created_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_user_updated_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_user_deleted_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_department_created_v3.return_value = mock_dispatcher_builder
        mock_dispatcher_builder.register_p2_contact_department_updated_v3.return_value = mock_dispatcher_builder
        mock_dispatcher_builder.build.return_value = mock_dispatcher

        mock_ws_client = Mock()
        mock_client.return_value = mock_ws_client

        ws_client = FeishuWebSocketClient()
        self.assertIsNotNone(ws_client.client)
        mock_client.assert_called_once()

    @patch("feishu.websocket_client.lark.ws.Client")
    @patch("feishu.websocket_client.lark.EventDispatcherHandler.builder")
    @patch("feishu.websocket_client.FeishuEventHandler")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_websocket_run(self, mock_handler, mock_builder, mock_client):
        mock_event_handler = Mock()
        mock_handler.return_value = mock_event_handler

        mock_dispatcher_builder = Mock()
        mock_builder.return_value = mock_dispatcher_builder
        mock_dispatcher_builder.register_p2_contact_user_created_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_user_updated_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_user_deleted_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_department_created_v3.return_value = mock_dispatcher_builder
        mock_dispatcher_builder.register_p2_contact_department_updated_v3.return_value = mock_dispatcher_builder

        mock_dispatcher = Mock()
        mock_dispatcher_builder.build.return_value = mock_dispatcher

        mock_ws_client = Mock()
        mock_client.return_value = mock_ws_client

        ws_client = FeishuWebSocketClient()
        ws_client.run()

        mock_ws_client.start.assert_called_once()

    @patch("feishu.websocket_client.lark.ws.Client")
    @patch("feishu.websocket_client.lark.EventDispatcherHandler.builder")
    @patch("feishu.websocket_client.FeishuEventHandler")
    @override_settings(FEISHU_APP_ID="test_app_id", FEISHU_APP_SECRET="test_secret")
    def test_websocket_stop(self, mock_handler, mock_builder, mock_client):
        mock_event_handler = Mock()
        mock_handler.return_value = mock_event_handler

        mock_dispatcher_builder = Mock()
        mock_builder.return_value = mock_dispatcher_builder
        mock_dispatcher_builder.register_p2_contact_user_created_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_user_updated_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_user_deleted_v3.return_value = (
            mock_dispatcher_builder
        )
        mock_dispatcher_builder.register_p2_contact_department_created_v3.return_value = mock_dispatcher_builder
        mock_dispatcher_builder.register_p2_contact_department_updated_v3.return_value = mock_dispatcher_builder

        mock_dispatcher = Mock()
        mock_dispatcher_builder.build.return_value = mock_dispatcher

        mock_ws_client = Mock()
        mock_client.return_value = mock_ws_client

        ws_client = FeishuWebSocketClient()
        ws_client.stop()

        mock_ws_client.stop.assert_called_once()
