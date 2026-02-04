from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Account, User
from accounts.serializers import (
    AccountSerializer,
    UserSerializer,
    UserListSerializer,
    UserCreateSerializer,
)
from core.authentication import MultiAuthentication
from core.permissions import IsAdminOnly, IsAdminOrSalesManager


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        refresh = RefreshToken.for_user(user)
        data["refresh"] = str(refresh)
        data["access"] = str(refresh.access_token)
        data["user"] = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "is_active": user.is_active,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name", "feishu_tenant_key"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("account", "manager").all()
    authentication_classes = [MultiAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSalesManager]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["account", "role", "is_active", "department_id"]
    search_fields = ["username", "display_name", "email", "mobile"]
    ordering_fields = ["date_joined", "username"]
    ordering = ["-date_joined"]

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        elif self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
