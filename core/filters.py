import django_filters as filters

from customers.models import Customer, Lead
from opportunities.models import Opportunity
from core.models import Activity


class CustomerFilter(filters.FilterSet):
    class Meta:
        model = Customer
        fields = {
            "account": ["exact"],
            "type": ["exact"],
            "tier": ["exact"],
            "status": ["exact"],
            "industry": ["exact"],
            "province": ["exact"],
            "city": ["exact"],
            "owner": ["exact"],
            "is_deleted": ["exact"],
            "ltv_score": ["gte", "lte"],
            "health_score": ["gte", "lte"],
            "annual_revenue": ["gte", "lte"],
            "created_at": ["gte", "lte"],
            "next_action_date": ["gte", "lte"],
        }

    name = filters.CharFilter(lookup_expr="icontains")
    short_name = filters.CharFilter(lookup_expr="icontains")
    ltv_score_min = filters.NumberFilter(field_name="ltv_score", lookup_expr="gte")
    ltv_score_max = filters.NumberFilter(field_name="ltv_score", lookup_expr="lte")
    health_score_min = filters.NumberFilter(
        field_name="health_score", lookup_expr="gte"
    )
    health_score_max = filters.NumberFilter(
        field_name="health_score", lookup_expr="lte"
    )
    annual_revenue_min = filters.NumberFilter(
        field_name="annual_revenue", lookup_expr="gte"
    )
    annual_revenue_max = filters.NumberFilter(
        field_name="annual_revenue", lookup_expr="lte"
    )
    created_at_gte = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_lte = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    next_action_date_gte = filters.DateFilter(
        field_name="next_action_date", lookup_expr="gte"
    )
    next_action_date_lte = filters.DateFilter(
        field_name="next_action_date", lookup_expr="lte"
    )


class OpportunityFilter(filters.FilterSet):
    class Meta:
        model = Opportunity
        fields = {
            "customer": ["exact"],
            "stage": ["exact"],
            "product_line": ["exact"],
            "owner": ["exact"],
            "amount": ["gte", "lte"],
            "probability": ["gte", "lte"],
            "expected_close_date": ["gte", "lte"],
            "created_at": ["gte", "lte"],
        }

    name = filters.CharFilter(lookup_expr="icontains")
    amount_min = filters.NumberFilter(field_name="amount", lookup_expr="gte")
    amount_max = filters.NumberFilter(field_name="amount", lookup_expr="lte")
    probability_min = filters.NumberFilter(field_name="probability", lookup_expr="gte")
    probability_max = filters.NumberFilter(field_name="probability", lookup_expr="lte")
    expected_close_date_gte = filters.DateFilter(
        field_name="expected_close_date", lookup_expr="gte"
    )
    expected_close_date_lte = filters.DateFilter(
        field_name="expected_close_date", lookup_expr="lte"
    )
    created_at_gte = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_lte = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")


class ActivityFilter(filters.FilterSet):
    class Meta:
        model = Activity
        fields = {
            "customer": ["exact"],
            "opportunity": ["exact"],
            "type": ["exact"],
            "direction": ["exact"],
            "owner": ["exact"],
            "activity_date": ["gte", "lte"],
            "next_action_date": ["gte", "lte"],
        }

    subject = filters.CharFilter(lookup_expr="icontains")
    activity_date_gte = filters.DateTimeFilter(
        field_name="activity_date", lookup_expr="gte"
    )
    activity_date_lte = filters.DateTimeFilter(
        field_name="activity_date", lookup_expr="lte"
    )
    next_action_date_gte = filters.DateFilter(
        field_name="next_action_date", lookup_expr="gte"
    )
    next_action_date_lte = filters.DateFilter(
        field_name="next_action_date", lookup_expr="lte"
    )


class LeadFilter(filters.FilterSet):
    class Meta:
        model = Lead
        fields = {
            "account": ["exact"],
            "status": ["exact"],
            "owner": ["exact"],
            "created_at": ["gte", "lte"],
        }

    company_name = filters.CharFilter(lookup_expr="icontains")
    contact_name = filters.CharFilter(lookup_expr="icontains")
    created_at_gte = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_lte = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
