from rest_framework import serializers
from django.utils import timezone
from core.models import Activity, StageHistory
from accounts.serializers import UserListSerializer
from customers.serializers import CustomerListSerializer, ContactSerializer
from opportunities.serializers import OpportunityListSerializer


class ActivityListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    opportunity_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            "id",
            "subject",
            "type",
            "direction",
            "activity_date",
            "customer_name",
            "opportunity_name",
            "owner_name",
            "next_action_date",
        ]
        read_only_fields = ["id", "created_at"]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_opportunity_name(self, obj):
        return obj.opportunity.name if obj.opportunity else None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.display_name or obj.owner.username
        return None


class ActivitySerializer(serializers.ModelSerializer):
    customer = CustomerListSerializer(read_only=True)
    opportunity = OpportunityListSerializer(read_only=True)
    contact = ContactSerializer(read_only=True)
    owner = UserListSerializer(read_only=True)
    created_by = UserListSerializer(read_only=True)
    participants = UserListSerializer(many=True, read_only=True)

    class Meta:
        model = Activity
        fields = [
            "id",
            "account",
            "customer",
            "opportunity",
            "contact",
            "type",
            "direction",
            "subject",
            "content",
            "outcome",
            "activity_date",
            "duration_minutes",
            "next_action",
            "next_action_date",
            "owner",
            "participants",
            "attachments",
            "created_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at"]


class ActivityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            "customer",
            "opportunity",
            "contact",
            "type",
            "direction",
            "subject",
            "content",
            "outcome",
            "activity_date",
            "duration_minutes",
            "next_action",
            "next_action_date",
            "owner",
        ]

    def validate_subject(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Subject is required and cannot be blank."
            )
        return value.strip()

    def validate_activity_date(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Activity date cannot be in the future.")
        return value


class StageHistorySerializer(serializers.ModelSerializer):
    changed_by = UserListSerializer(read_only=True)
    opportunity = OpportunityListSerializer(read_only=True)

    class Meta:
        model = StageHistory
        fields = [
            "id",
            "opportunity",
            "from_stage",
            "to_stage",
            "duration_days",
            "changed_by",
            "changed_at",
            "notes",
        ]
        read_only_fields = ["id", "changed_at"]
