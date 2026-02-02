import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class Account(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="企业名称")
    feishu_tenant_key = models.CharField(
        max_length=100, unique=True, verbose_name="飞书租户Key"
    )
    is_active = models.BooleanField(default=True, verbose_name="是否激活")
    settings = models.JSONField(default=dict, verbose_name="企业配置")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        db_table = "accounts_account"
        verbose_name = "企业账号"
        verbose_name_plural = "企业账号"
        indexes = [
            models.Index(fields=["feishu_tenant_key"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "系统管理员"),
        ("sales_manager", "销售经理"),
        ("sales", "销售人员"),
        ("presales", "售前支持"),
        ("aftersales", "售后支持"),
        ("viewer", "只读用户"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="users")
    feishu_open_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True, verbose_name="飞书OpenID"
    )
    feishu_union_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True, verbose_name="飞书UnionID"
    )
    feishu_user_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True, verbose_name="飞书UserID"
    )
    display_name = models.CharField(max_length=100, verbose_name="显示名称")
    avatar_url = models.URLField(null=True, blank=True, verbose_name="头像URL")
    mobile = models.CharField(
        max_length=20, null=True, blank=True, verbose_name="手机号"
    )
    department_id = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="部门ID"
    )
    department_name = models.CharField(
        max_length=200, null=True, blank=True, verbose_name="部门名称"
    )
    job_title = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="职位"
    )
    feishu_team_id = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="飞书团队ID"
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="team_members",
        verbose_name="上级经理",
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="sales", verbose_name="角色"
    )
    last_sync_at = models.DateTimeField(
        null=True, blank=True, verbose_name="最后同步时间"
    )

    class Meta:
        db_table = "accounts_user"
        verbose_name = "用户"
        verbose_name_plural = "用户"
        indexes = [
            models.Index(fields=["account", "is_active"]),
            models.Index(fields=["feishu_open_id"]),
            models.Index(fields=["role"]),
            models.Index(fields=["manager"]),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.username})"
