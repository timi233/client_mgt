from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Count

from opportunities.models import Opportunity
from core.models import StageHistory
from opportunities.serializers import (
    OpportunityListSerializer,
    OpportunitySerializer,
    OpportunityCreateSerializer,
)
from core.authentication import MultiAuthentication
from core.permissions import IsAccountMember
from core.filters import OpportunityFilter


class OpportunityViewSet(viewsets.ModelViewSet):
    queryset = (
        Opportunity.objects.select_related(
            "customer", "owner", "created_by", "converted_from_lead"
        )
        .prefetch_related("team_members")
        .all()
    )
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAccountMember]
    filterset_class = OpportunityFilter
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "expected_close_date", "amount", "probability"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return OpportunityListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return OpportunityCreateSerializer
        return OpportunitySerializer

    @action(detail=True, methods=["post"])
    def change_stage(self, request, pk=None):
        opportunity = self.get_object()
        previous_stage = opportunity.stage
        new_stage = request.data.get("stage")

        if not new_stage:
            return Response(
                {"error": "stage is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        opportunity.stage = new_stage
        opportunity.save()

        StageHistory.objects.create(
            opportunity=opportunity,
            from_stage=previous_stage,
            to_stage=new_stage,
            changed_by=request.user,
        )

        serializer = self.get_serializer(opportunity)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def mark_won(self, request, pk=None):
        opportunity = self.get_object()
        opportunity.stage = "closed_won"
        opportunity.actual_close_date = timezone.now().date()
        opportunity.save()
        serializer = self.get_serializer(opportunity)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def mark_lost(self, request, pk=None):
        opportunity = self.get_object()
        opportunity.stage = "closed_lost"
        opportunity.loss_reason = request.data.get("loss_reason")
        opportunity.loss_detail = request.data.get("loss_detail")
        opportunity.actual_close_date = timezone.now().date()
        opportunity.save()
        serializer = self.get_serializer(opportunity)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def pipeline_summary(self, request):
        summary = Opportunity.objects.values("stage").annotate(count=Count("id"))
        return Response(list(summary), status=status.HTTP_200_OK)
