from rest_framework import serializers
from opportunities.models import Opportunity
from accounts.serializers import UserListSerializer
from customers.serializers import CustomerListSerializer, LeadSerializer


class OpportunityListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "name",
            "customer_name",
            "product_line",
            "stage",
            "amount",
            "probability",
            "expected_close_date",
            "owner_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.display_name or obj.owner.username
        return None


class OpportunitySerializer(serializers.ModelSerializer):
    customer = CustomerListSerializer(read_only=True)
    owner = UserListSerializer(read_only=True)
    team_members = UserListSerializer(many=True, read_only=True)
    created_by = UserListSerializer(read_only=True)
    converted_from_lead = LeadSerializer(read_only=True)

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "customer",
            "name",
            "description",
            "product_line",
            "stage",
            "amount",
            "actual_amount",
            "probability",
            "expected_close_date",
            "actual_close_date",
            "owner",
            "team_members",
            "source_tracking_id",
            "converted_from_lead",
            "competitors",
            "competitive_advantage",
            "loss_reason",
            "loss_detail",
            "notes",
            "created_at",
            "created_by",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "source_tracking_id"]


class OpportunityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = [
            "customer",
            "name",
            "description",
            "product_line",
            "stage",
            "amount",
            "probability",
            "expected_close_date",
            "owner",
            "notes",
        ]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name is required and cannot be blank.")
        return value.strip()

    def validate_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate_probability(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Probability must be between 0 and 100.")
        return value
