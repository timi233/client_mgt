from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import AccountViewSet, UserViewSet, CustomTokenObtainPairView

router = DefaultRouter()
router.register(r"accounts", AccountViewSet)
router.register(r"users", UserViewSet)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path(
        "login", CustomTokenObtainPairView.as_view(), name="token_obtain_pair_no_slash"
    ),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/refresh", TokenRefreshView.as_view(), name="token_refresh_no_slash"),
    path("", include(router.urls)),
]
