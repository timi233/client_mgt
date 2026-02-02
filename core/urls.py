from django.urls import path, include
from rest_framework.routers import DefaultRouter

from core.views import ActivityViewSet, StageHistoryViewSet

router = DefaultRouter()
router.register(r"activities", ActivityViewSet)
router.register(r"stage-history", StageHistoryViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
