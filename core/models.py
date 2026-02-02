import uuid
from django.db import models
from accounts.models import Account, User
from customers.models import Customer, Contact
from opportunities.models import Opportunity


class Activity(models.Model):
    TYPE_CHOICES = [
        ("call", "电话"),
        ("email", "邮件"),
        ("meeting", "会议"),
        ("visit", "拜访"),
        ("demo", "演示"),
        ("proposal", "方案"),
        ("contract", "合同"),
        ("other", "其他"),
    ]

    DIRECTION_CHOICES = [
        ("outbound", "外呼"),
        ("inbound", "接入"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="activities"
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="activities"
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
        verbose_name="商机",
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
        verbose_name="联系人",
    )
    type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default="other", verbose_name="活动类型"
    )
    direction = models.CharField(
        max_length=20,
        choices=DIRECTION_CHOICES,
        null=True,
        blank=True,
        verbose_name="方向",
    )
    subject = models.CharField(max_length=200, verbose_name="主题")
    content = models.TextField(verbose_name="内容")
    outcome = models.TextField(null=True, blank=True, verbose_name="结果")
    activity_date = models.DateTimeField(verbose_name="活动日期")
    duration_minutes = models.IntegerField(
        null=True, blank=True, verbose_name="时长(分钟)"
    )
    next_action = models.CharField(
        max_length=200, null=True, blank=True, verbose_name="后续行动"
    )
    next_action_date = models.DateField(
        null=True, blank=True, verbose_name="后续行动日期"
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_activities",
        verbose_name="负责人",
    )
    participants = models.ManyToManyField(
        User, related_name="participated_activities", blank=True, verbose_name="参与者"
    )
    attachments = models.JSONField(default=list, blank=True, verbose_name="附件")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_activities",
        verbose_name="创建人",
    )

    class Meta:
        db_table = "core_activity"
        verbose_name = "活动"
        verbose_name_plural = "活动"
        indexes = [
            models.Index(fields=["customer", "activity_date"]),
            models.Index(fields=["owner", "activity_date"]),
            models.Index(fields=["type"]),
            models.Index(fields=["direction"]),
            models.Index(fields=["activity_date"]),
            models.Index(fields=["next_action_date"]),
        ]
        ordering = ["-activity_date"]

    def __str__(self):
        return f"{self.subject} ({self.activity_date})"


class StageHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name="stage_history",
        verbose_name="商机",
    )
    from_stage = models.CharField(max_length=20, verbose_name="原阶段")
    to_stage = models.CharField(max_length=20, verbose_name="新阶段")
    duration_days = models.IntegerField(null=True, blank=True, verbose_name="持续天数")
    changed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="变更人"
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name="变更时间")
    notes = models.TextField(null=True, blank=True, verbose_name="备注")

    class Meta:
        db_table = "core_stagehistory"
        verbose_name = "阶段历史"
        verbose_name_plural = "阶段历史"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.opportunity.name}: {self.from_stage} -> {self.to_stage}"
