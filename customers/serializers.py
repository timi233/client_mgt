from rest_framework import serializers
from customers.models import (
    Customer,
    Contact,
    Lead,
    CustomerLTVProfile,
    CustomerLTV,
    LTVHistory,
    CustomerPool,
    PoolCustomer,
)
from accounts.serializers import UserListSerializer


class CustomerListSerializer(serializers.ModelSerializer):
    owner = UserListSerializer(read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "short_name",
            "type",
            "tier",
            "industry",
            "province",
            "city",
            "status",
            "owner",
            "health_score",
            "potential_score",
            "ltv_score",
            "ltv_tier",
            "next_action_date",
            "created_at",
            "owner_name",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "health_score",
            "potential_score",
            "ltv_score",
            "ltv_tier",
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.display_name or obj.owner.username
        return None


class CustomerSerializer(serializers.ModelSerializer):
    owner = UserListSerializer(read_only=True)
    team_members = UserListSerializer(many=True, read_only=True)
    created_by = UserListSerializer(read_only=True)
    updated_by = UserListSerializer(read_only=True)
    deleted_by = UserListSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "account",
            "name",
            "short_name",
            "unified_social_credit_code",
            "type",
            "tier",
            "industry",
            "province",
            "city",
            "district",
            "address",
            "employee_count",
            "annual_revenue",
            "source",
            "owner",
            "team_members",
            "current_pool",
            "pool_entered_at",
            "status",
            "health_score",
            "potential_score",
            "engagement_score",
            "ltv_score",
            "ltv_tier",
            "ltv_calculated_at",
            "first_contact_date",
            "last_contact_date",
            "next_action_date",
            "tags",
            "description",
            "internal_notes",
            "deleted_at",
            "deleted_by",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
            "ltv_calculated_at",
            "pool_entered_at",
        ]


class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "name",
            "short_name",
            "unified_social_credit_code",
            "type",
            "tier",
            "industry",
            "province",
            "city",
            "district",
            "address",
            "employee_count",
            "annual_revenue",
            "source",
            "owner",
            "description",
        ]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name is required and cannot be blank.")
        return value.strip()

    def validate_unified_social_credit_code(self, value):
        if value and len(value) != 18:
            raise serializers.ValidationError(
                "Unified social credit code must be 18 characters long."
            )
        return value


class ContactSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id",
            "customer",
            "name",
            "gender",
            "job_title",
            "department",
            "mobile",
            "phone",
            "email",
            "wechat",
            "role_type",
            "is_primary",
            "preferred_contact_method",
            "relationship_level",
            "notes",
            "created_at",
            "updated_at",
            "customer_name",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None


class ContactListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id",
            "name",
            "job_title",
            "department",
            "mobile",
            "email",
            "role_type",
            "is_primary",
            "customer_name",
        ]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None


class LeadSerializer(serializers.ModelSerializer):
    owner = UserListSerializer(read_only=True)
    converted_to_customer = CustomerListSerializer(read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id",
            "account",
            "company_name",
            "contact_name",
            "contact_mobile",
            "contact_email",
            "source",
            "source_detail",
            "status",
            "owner",
            "converted_to_customer",
            "converted_at",
            "tracking_id",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tracking_id",
            "created_at",
            "updated_at",
            "converted_at",
        ]


class LeadListSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "company_name",
            "contact_name",
            "contact_mobile",
            "source",
            "status",
            "owner_name",
            "created_at",
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.display_name or obj.owner.username
        return None


class CustomerLTVProfileSerializer(serializers.ModelSerializer):
    last_updated_by = UserListSerializer(read_only=True)

    class Meta:
        model = CustomerLTVProfile
        fields = [
            "id",
            "customer",
            "market_cap_billion",
            "it_investment_wan",
            "revenue_2022_wan",
            "revenue_2023_wan",
            "revenue_2024_wan",
            "industry_position",
            "known_history_performance",
            "past_three_years_performance",
            "future_three_years_opportunity",
            "has_ip_guard_opportunity",
            "has_anyshare_opportunity",
            "is_strategic_partner",
            "can_access_decision_makers",
            "profile_version",
            "data_source",
            "last_updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CustomerLTVSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerLTV
        fields = [
            "id",
            "customer",
            "ltv_score",
            "ltv_tier",
            "explicit_value_score",
            "implicit_value_score",
            "growth_value_score",
            "historical_revenue",
            "current_pipeline_value",
            "predicted_revenue",
            "purchase_frequency",
            "average_order_value",
            "customer_lifespan_months",
            "churn_probability",
            "engagement_level",
            "last_purchase_days_ago",
            "nps_score",
            "data_completeness",
            "calculation_method",
            "last_calculated_at",
            "calculated_by",
            "notes",
            "customer_name",
        ]
        read_only_fields = ["id", "last_calculated_at"]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None


class LTVHistorySerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = LTVHistory
        fields = [
            "id",
            "customer_ltv",
            "ltv_score",
            "ltv_tier",
            "engagement_level",
            "change_reason",
            "change_detail",
            "recorded_at",
            "customer_name",
        ]
        read_only_fields = ["id", "recorded_at"]

    def get_customer_name(self, obj):
        if obj.customer_ltv and obj.customer_ltv.customer:
            return obj.customer_ltv.customer.name
        return None


class CustomerPoolSerializer(serializers.ModelSerializer):
    customer_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomerPool
        fields = [
            "id",
            "account",
            "name",
            "description",
            "rules",
            "allowed_roles",
            "allowed_departments",
            "is_active",
            "created_at",
            "customer_count",
        ]
        read_only_fields = ["id", "created_at"]

    def get_customer_count(self, obj):
        return obj.pool_customers.count()


class CustomerPoolListSerializer(serializers.ModelSerializer):
    customer_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomerPool
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "customer_count",
            "created_at",
        ]

    def get_customer_count(self, obj):
        return obj.pool_customers.count()


class PoolCustomerSerializer(serializers.ModelSerializer):
    customer = CustomerListSerializer(read_only=True)
    owner = UserListSerializer(read_only=True)
    previous_owner = UserListSerializer(read_only=True)
    claimed_by = UserListSerializer(read_only=True)

    class Meta:
        model = PoolCustomer
        fields = [
            "id",
            "pool",
            "customer",
            "owner",
            "recycled_at",
            "recycled_reason",
            "previous_owner",
            "claimed_at",
            "claimed_by",
            "protection_until",
            "last_released_at",
            "last_claimed_at",
            "status",
        ]
        read_only_fields = [
            "id",
            "recycled_at",
            "claimed_at",
            "last_released_at",
            "last_claimed_at",
        ]


class PoolCustomerListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = PoolCustomer
        fields = [
            "id",
            "customer_name",
            "owner_name",
            "status",
            "recycled_at",
            "claimed_at",
            "protection_until",
        ]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.display_name or obj.owner.username
        return None
