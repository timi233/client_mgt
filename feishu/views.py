from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from urllib.parse import quote, urlencode
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import json

from accounts.models import User, Account
import requests
import logging

from feishu.event_handler import FeishuEventHandler


logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def feishu_login(request):
    redirect_uri = getattr(settings, "FEISHU_REDIRECT_URI", None)
    if not redirect_uri:
        redirect_uri = request.build_absolute_uri(reverse("feishu:callback"))

    app_id = getattr(settings, "FEISHU_APP_ID", "")
    encoded_redirect_uri = quote(redirect_uri, safe="")
    oauth_url = f"https://open.feishu.cn/open-apis/authen/v1/authorize?app_id={app_id}&redirect_uri={encoded_redirect_uri}"

    return redirect(oauth_url)


@api_view(["GET"])
@permission_classes([AllowAny])
def feishu_callback(request):
    code = request.GET.get("code")
    if not code:
        return Response({"error": "Missing authorization code"}, status=400)

    try:
        app_id = getattr(settings, "FEISHU_APP_ID", "")
        app_secret = getattr(settings, "FEISHU_APP_SECRET", "")
        redirect_uri = getattr(settings, "FEISHU_REDIRECT_URI", None)
        if not redirect_uri:
            redirect_uri = request.build_absolute_uri(reverse("feishu:callback"))

        token_url = "https://open.feishu.cn/open-apis/authen/v1/access_token"
        token_payload = {
            "app_id": app_id,
            "app_secret": app_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }

        response = requests.post(token_url, json=token_payload)
        response.raise_for_status()
        token_data = response.json()

        if token_data.get("code") != 0:
            return Response({"error": token_data.get("msg")}, status=400)

        access_token = token_data.get("access_token")

        user_info_url = "https://open.feishu.cn/open-apis/authen/v1/user_info"
        headers = {"Authorization": f"Bearer {access_token}"}
        user_response = requests.get(user_info_url, headers=headers)
        user_response.raise_for_status()
        user_data = user_response.json()

        if user_data.get("code") != 0:
            return Response({"error": user_data.get("msg")}, status=400)

        feishu_user = user_data.get("data", {})

        account = Account.objects.filter(is_active=True).first()
        if not account:
            return Response({"error": "No active account found"}, status=400)

        user = None
        feishu_user_id = feishu_user.get("user_id")
        feishu_open_id = feishu_user.get("open_id")
        feishu_union_id = feishu_user.get("union_id")

        if feishu_user_id:
            user = User.objects.filter(feishu_user_id=feishu_user_id).first()
        if not user and feishu_open_id:
            user = User.objects.filter(feishu_open_id=feishu_open_id).first()

        username = (
            feishu_user.get("email", "")
            or feishu_user.get("name", "")
            or feishu_user_id
        )
        username = username[:150]

        if user:
            user.username = username
            user.display_name = feishu_user.get("name") or username
            user.avatar_url = feishu_user.get("avatar_url") or feishu_user.get("avatar")
            user.mobile = feishu_user.get("mobile")
            if feishu_user.get("email"):
                user.email = feishu_user.get("email")
            user.department_id = (
                feishu_user.get("department_ids", [""])[0]
                if feishu_user.get("department_ids")
                else None
            )
            user.department_name = ""
            user.job_title = feishu_user.get("job_title")
            user.last_sync_at = timezone.now()
            user.save()
            logger.info(f"Updated existing user {username} from Feishu OAuth")
        else:
            user = User.objects.create(
                account=account,
                username=username,
                feishu_open_id=feishu_open_id,
                feishu_union_id=feishu_union_id,
                feishu_user_id=feishu_user_id,
                display_name=feishu_user.get("name") or username,
                avatar_url=feishu_user.get("avatar_url") or feishu_user.get("avatar"),
                mobile=feishu_user.get("mobile"),
                email=feishu_user.get("email") or "",
                department_id=feishu_user.get("department_ids", [""])[0]
                if feishu_user.get("department_ids")
                else None,
                job_title=feishu_user.get("job_title"),
                role="sales",
                is_active=True,
            )
            logger.info(f"Created new user {username} from Feishu OAuth")

        refresh = RefreshToken.for_user(user)

        user_data_json = json.dumps({
            "id": str(user.id),
            "username": user.username,
            "display_name": user.display_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "role": user.role,
        })

        params = urlencode({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_data_json,
        })

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/callback?{params}")

    except requests.RequestException as e:
        logger.error(f"Feishu OAuth callback error: {e}")
        return Response({"error": "OAuth token exchange failed"}, status=500)
    except Exception as e:
        logger.error(f"Feishu OAuth callback error: {e}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(["POST"])
@permission_classes([AllowAny])
def feishu_logout(request):
    return Response({"message": "Logged out successfully"})


@api_view(["POST"])
@permission_classes([AllowAny])
def feishu_event_webhook(request):
    try:
        if request.content_type == "application/x-www-form-urlencoded":
            payload = request.POST.dict()
        else:
            payload = json.loads(request.body)

        challenge = payload.get("challenge")
        if challenge:
            return {"challenge": challenge}

        event_handler = FeishuEventHandler()
        result = event_handler.handle_event(payload)

        return Response(result)

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON payload: {e}")
        return Response({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error(f"Feishu webhook error: {e}")
        return Response({"error": "Internal server error"}, status=500)
