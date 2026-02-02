from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from customers.models import Customer, Contact, Lead, CustomerPool, PoolCustomer
from customers.serializers import (
    CustomerListSerializer,
    CustomerSerializer,
    CustomerCreateSerializer,
    ContactSerializer,
    ContactListSerializer,
    LeadSerializer,
    LeadListSerializer,
    CustomerPoolSerializer,
    CustomerPoolListSerializer,
    PoolCustomerSerializer,
    PoolCustomerListSerializer,
)
from core.authentication import MultiAuthentication
from core.permissions import IsAccountMember, IsAdminOrSalesManager, IsSalesOrAbove
from core.filters import CustomerFilter, LeadFilter


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = (
        Customer.objects.select_related("account", "owner", "created_by")
        .prefetch_related("team_members")
        .filter(is_deleted=False)
    )
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAccountMember]
    filterset_class = CustomerFilter
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "short_name", "unified_social_credit_code"]
    ordering_fields = ["created_at", "name", "ltv_score", "health_score"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return CustomerListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return CustomerCreateSerializer
        return CustomerSerializer

    @action(detail=True, methods=["post"])
    def soft_delete(self, request, pk=None):
        customer = self.get_object()
        customer.is_deleted = True
        customer.deleted_at = timezone.now()
        customer.deleted_by = request.user
        customer.save()
        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def assign_owner(self, request, pk=None):
        customer = self.get_object()
        owner_id = request.data.get("owner")
        customer.owner_id = owner_id
        customer.save()
        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def add_to_pool(self, request, pk=None):
        customer = self.get_object()
        pool_id = request.data.get("pool")
        customer.current_pool_id = pool_id
        customer.pool_entered_at = timezone.now()
        customer.save()
        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.select_related("customer").all()
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAccountMember]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["customer", "role_type", "is_primary"]
    search_fields = ["name", "mobile", "email"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ContactListSerializer
        return ContactSerializer


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related(
        "account", "owner", "converted_to_customer"
    ).all()
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAccountMember]
    filterset_class = LeadFilter
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["company_name", "contact_name", "contact_mobile"]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return LeadListSerializer
        return LeadSerializer

    @action(detail=True, methods=["post"])
    def convert_to_customer(self, request, pk=None):
        lead = self.get_object()
        lead.status = "converted"
        lead.converted_at = timezone.now()
        customer_id = request.data.get("customer_id")
        if customer_id:
            lead.converted_to_customer_id = customer_id
        lead.save()
        serializer = self.get_serializer(lead)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomerPoolViewSet(viewsets.ModelViewSet):
    queryset = CustomerPool.objects.select_related("account").all()
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSalesManager]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["account", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return CustomerPoolListSerializer
        return CustomerPoolSerializer


class PoolCustomerViewSet(viewsets.ModelViewSet):
    queryset = PoolCustomer.objects.select_related("pool", "customer", "owner").all()
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsSalesOrAbove]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["pool", "status", "owner"]
    search_fields = ["customer__name"]
    ordering_fields = ["recycled_at", "claimed_at"]
    ordering = ["-recycled_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PoolCustomerListSerializer
        return PoolCustomerSerializer

    @action(detail=True, methods=["post"])
    def claim(self, request, pk=None):
        pool_customer = self.get_object()
        pool_customer.status = "claimed"
        pool_customer.claimed_at = timezone.now()
        pool_customer.claimed_by = request.user
        pool_customer.owner = request.user
        pool_customer.save()
        serializer = self.get_serializer(pool_customer)
        return Response(serializer.data, status=status.HTTP_200_OK)
