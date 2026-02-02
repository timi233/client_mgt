from django.urls import path
from feishu import views

app_name = "feishu"

urlpatterns = [
    path("login/", views.feishu_login, name="login"),
    path("callback/", views.feishu_callback, name="callback"),
    path("logout/", views.feishu_logout, name="logout"),
    path("events/", views.feishu_event_webhook, name="events"),
]
