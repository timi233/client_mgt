from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from accounts.models import Account, User


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "feishu_tenant_key",
            "is_active",
            "settings",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class UserListSerializer(serializers.ModelSerializer):
    account_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "email",
            "role",
            "department_name",
            "job_title",
            "is_active",
            "account_name",
        ]

    def get_account_name(self, obj):
        return obj.account.name if obj.account else None


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "display_name"]


class UserSerializer(serializers.ModelSerializer):
    account = AccountSerializer(read_only=True)
    manager = UserMinimalSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "account",
            "username",
            "password",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "is_superuser",
            "last_login",
            "date_joined",
            "feishu_open_id",
            "feishu_union_id",
            "feishu_user_id",
            "display_name",
            "avatar_url",
            "mobile",
            "department_id",
            "department_name",
            "job_title",
            "feishu_team_id",
            "manager",
            "role",
            "last_sync_at",
        ]
        read_only_fields = ["id", "last_login", "date_joined", "last_sync_at"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        if "password" in validated_data:
            validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "email",
            "display_name",
            "account",
            "role",
            "mobile",
            "department_id",
            "department_name",
            "job_title",
            "manager",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters long."
            )
        return value

    def create(self, validated_data):
        if "password" in validated_data:
            validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)
