import uuid
from django.db import models
from accounts.models import User


class Opportunity(models.Model):
    PRODUCT_LINE_CHOICES = [
        ("ip_guard", "IP-Guard"),
        ("anybackup", "AnyBackup"),
        ("anyshare", "AnyShare"),
        ("bundle", "套餐"),
        ("other", "其他"),
    ]

    STAGE_CHOICES = [
        ("prospecting", "探索"),
        ("qualification", "资格确认"),
        ("proposal", "方案"),
        ("negotiation", "谈判"),
        ("closed_won", "赢单"),
        ("closed_lost", "输单"),
        ("on_hold", "搁置"),
    ]

    LOSS_REASON_CHOICES = [
        ("price", "价格"),
        ("competitor", "竞争对手"),
        ("timing", "时机"),
        ("no_budget", "无预算"),
        ("no_decision", "无法决策"),
        ("other", "其他"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.CASCADE,
        related_name="opportunities",
        verbose_name="客户",
    )
    name = models.CharField(max_length=200, verbose_name="商机名称")
    description = models.TextField(null=True, blank=True, verbose_name="描述")
    product_line = models.CharField(
        max_length=20,
        choices=PRODUCT_LINE_CHOICES,
        default="other",
        verbose_name="产品线",
    )
    stage = models.CharField(
        max_length=20, choices=STAGE_CHOICES, default="prospecting", verbose_name="阶段"
    )
    amount = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="预计金额"
    )
    actual_amount = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="实际金额"
    )
    probability = models.IntegerField(default=0, verbose_name="成交概率(%)")
    expected_close_date = models.DateField(
        null=True, blank=True, verbose_name="预计成交日期"
    )
    actual_close_date = models.DateField(
        null=True, blank=True, verbose_name="实际成交日期"
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_opportunities",
        verbose_name="负责人",
    )
    team_members = models.ManyToManyField(
        User, related_name="team_opportunities", blank=True, verbose_name="团队成员"
    )
    source_tracking_id = models.UUIDField(
        null=True, blank=True, db_index=True, verbose_name="来源追踪ID"
    )
    converted_from_lead = models.ForeignKey(
        "customers.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="converted_opportunities",
        verbose_name="转化线索",
    )
    competitors = models.JSONField(default=list, blank=True, verbose_name="竞争对手")
    competitive_advantage = models.TextField(
        null=True, blank=True, verbose_name="竞争优势"
    )
    loss_reason = models.CharField(
        max_length=20,
        choices=LOSS_REASON_CHOICES,
        null=True,
        blank=True,
        verbose_name="输单原因",
    )
    loss_detail = models.TextField(null=True, blank=True, verbose_name="输单详情")
    notes = models.TextField(null=True, blank=True, verbose_name="备注")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_opportunities",
        verbose_name="创建人",
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "opportunities_opportunity"
        verbose_name = "商机"
        verbose_name_plural = "商机"
        indexes = [
            models.Index(fields=["customer", "stage"]),
            models.Index(fields=["owner", "stage"]),
            models.Index(fields=["stage", "probability"]),
            models.Index(fields=["amount"]),
            models.Index(fields=["product_line"]),
            models.Index(fields=["expected_close_date"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.stage})"
