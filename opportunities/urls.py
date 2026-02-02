from django.urls import path, include
from rest_framework.routers import DefaultRouter

from opportunities.views import OpportunityViewSet

router = DefaultRouter()
router.register(r"opportunities", OpportunityViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
