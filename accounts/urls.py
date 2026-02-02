from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import AccountViewSet, UserViewSet

router = DefaultRouter()
router.register(r"accounts", AccountViewSet)
router.register(r"users", UserViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
