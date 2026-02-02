from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from core.models import Activity, StageHistory
from core.serializers import (
    ActivityListSerializer,
    ActivitySerializer,
    ActivityCreateSerializer,
    StageHistorySerializer,
)
from core.authentication import MultiAuthentication
from core.permissions import IsAccountMember
from core.filters import ActivityFilter


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = (
        Activity.objects.select_related(
            "account", "customer", "opportunity", "contact", "owner", "created_by"
        )
        .prefetch_related("participants")
        .all()
    )
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAccountMember]
    filterset_class = ActivityFilter
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["subject", "content"]
    ordering_fields = ["activity_date", "created_at"]
    ordering = ["-activity_date"]

    def get_serializer_class(self):
        if self.action == "list":
            return ActivityListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ActivityCreateSerializer
        return ActivitySerializer

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        today = timezone.now().date()
        upcoming_activities = self.queryset.filter(next_action_date__gte=today)
        serializer = ActivityListSerializer(upcoming_activities, many=True)
        return Response(serializer.data)


class StageHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StageHistorySerializer
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAccountMember]
    queryset = StageHistory.objects.select_related("opportunity", "changed_by").all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["opportunity"]
    ordering_fields = ["changed_at"]
    ordering = ["-changed_at"]
