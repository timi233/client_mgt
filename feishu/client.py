import logging
import requests
from django.conf import settings
from django.core.cache import cache


logger = logging.getLogger(__name__)


class FeishuAPIClient:
    BASE_URL = "https://open.feishu.cn/open-apis"

    def __init__(self, app_id=None, app_secret=None):
        self.app_id = app_id or getattr(settings, "FEISHU_APP_ID", "")
        self.app_secret = app_secret or getattr(settings, "FEISHU_APP_SECRET", "")
        self.token_cache_key = "feishu:tenant_access_token"

    def get_tenant_access_token(self):
        cached_token = cache.get(self.token_cache_key)
        if cached_token:
            return cached_token

        url = f"{self.BASE_URL}/auth/v3/tenant_access_token/internal/"
        payload = {
            "app_id": self.app_id,
            "app_secret": self.app_secret,
        }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            if data.get("code") == 0:
                token = data.get("tenant_access_token")
                expire = data.get("expire", 7200)
                cache.set(self.token_cache_key, token, timeout=expire - 300)
                return token
            else:
                logger.error(f"Feishu API error: {data.get('msg')}")
                raise Exception(f"Feishu API error: {data.get('msg')}")
        except requests.RequestException as e:
            logger.error(f"Feishu API request failed: {e}")
            raise

    def _make_request(self, method, endpoint, **kwargs):
        token = self.get_tenant_access_token()
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.request(method, url, headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Feishu API request failed: {e}")
            raise

    def get_user_info(self, user_id, user_id_type="open_id"):
        endpoint = f"/contact/v3/users/{user_id}"
        params = {"user_id_type": user_id_type}
        return self._make_request("GET", endpoint, params=params)

    def get_department_list(
        self, parent_department_id="0", page_token=None, page_size=50
    ):
        endpoint = "/contact/v3/departments"
        params = {
            "parent_department_id": parent_department_id,
            "page_size": page_size,
        }
        if page_token:
            params["page_token"] = page_token
        return self._make_request("GET", endpoint, params=params)

    def get_user_list(self, department_id=None, page_token=None):
        endpoint = "/contact/v3/users"
        params = {}
        if department_id:
            params["department_id"] = department_id
        if page_token:
            params["page_token"] = page_token
        params["page_size"] = 50
        return self._make_request("GET", endpoint, params=params)

    def send_message(self, receive_id, msg_type, content, receive_id_type=None):
        endpoint = "/im/v1/messages"
        receive_id_type = receive_id_type or "open_id"

        import json

        payload = {
            "receive_id": receive_id,
            "msg_type": msg_type,
            "content": json.dumps(content),
        }

        params = {"receive_id_type": receive_id_type}

        return self._make_request("POST", endpoint, json=payload, params=params)


feishu_client = FeishuAPIClient()
