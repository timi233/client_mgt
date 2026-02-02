import uuid
from django.db import models
from accounts.models import Account, User


class Customer(models.Model):
    TYPE_CHOICES = [
        ("enterprise", "企业客户"),
        ("government", "政府客户"),
        ("institution", "机构客户"),
        ("other", "其他"),
    ]

    TIER_CHOICES = [
        ("strategic", "战略客户"),
        ("key", "重点客户"),
        ("standard", "标准客户"),
        ("potential", "潜力客户"),
    ]

    SOURCE_CHOICES = [
        ("referral", "转介绍"),
        ("partner", "合作伙伴"),
        ("exhibition", "展会"),
        ("website", "官网"),
        ("cold_call", "电销"),
        ("other", "其他"),
    ]

    STATUS_CHOICES = [
        ("lead", "线索"),
        ("qualified", "合格线索"),
        ("negotiating", "洽谈中"),
        ("customer", "成交客户"),
        ("inactive", "非活跃"),
        ("lost", "流失"),
    ]

    LTV_TIER_CHOICES = [
        ("platinum", "白金"),
        ("gold", "黄金"),
        ("silver", "白银"),
        ("bronze", "青铜"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="customers"
    )

    name = models.CharField(max_length=200, verbose_name="客户名称")
    short_name = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="简称"
    )
    unified_social_credit_code = models.CharField(
        max_length=50, null=True, blank=True, verbose_name="统一社会信用代码"
    )

    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default="enterprise",
        verbose_name="客户类型",
    )
    tier = models.CharField(
        max_length=20, choices=TIER_CHOICES, default="standard", verbose_name="客户等级"
    )
    industry = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="行业"
    )

    province = models.CharField(
        max_length=50, null=True, blank=True, verbose_name="省份"
    )
    city = models.CharField(max_length=50, null=True, blank=True, verbose_name="城市")
    district = models.CharField(
        max_length=50, null=True, blank=True, verbose_name="区县"
    )
    address = models.TextField(null=True, blank=True, verbose_name="详细地址")

    employee_count = models.IntegerField(null=True, blank=True, verbose_name="员工人数")
    annual_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="年营业额"
    )

    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        null=True,
        blank=True,
        verbose_name="客户来源",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_customers",
        verbose_name="负责人",
    )
    team_members = models.ManyToManyField(
        User, related_name="team_customers", blank=True, verbose_name="团队成员"
    )

    current_pool = models.ForeignKey(
        "CustomerPool",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="当前客户池",
    )
    pool_entered_at = models.DateTimeField(
        null=True, blank=True, verbose_name="进入客户池时间"
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="lead", verbose_name="客户状态"
    )
    health_score = models.IntegerField(default=0, verbose_name="健康分")
    potential_score = models.IntegerField(default=0, verbose_name="潜力分")
    engagement_score = models.IntegerField(default=0, verbose_name="活跃分")

    ltv_score = models.IntegerField(default=0, verbose_name="LTV评分")
    ltv_tier = models.CharField(
        max_length=20,
        choices=LTV_TIER_CHOICES,
        default="bronze",
        verbose_name="LTV等级",
    )
    ltv_calculated_at = models.DateTimeField(
        null=True, blank=True, verbose_name="LTV计算时间"
    )

    first_contact_date = models.DateField(
        null=True, blank=True, verbose_name="首次联系日期"
    )
    last_contact_date = models.DateField(
        null=True, blank=True, verbose_name="最后联系日期"
    )
    next_action_date = models.DateField(
        null=True, blank=True, verbose_name="下次行动日期"
    )

    tags = models.JSONField(default=list, verbose_name="标签")
    description = models.TextField(null=True, blank=True, verbose_name="描述")
    internal_notes = models.TextField(null=True, blank=True, verbose_name="内部备注")

    is_deleted = models.BooleanField(default=False, verbose_name="已删除")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="删除时间")
    deleted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deleted_customers",
        verbose_name="删除人",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_customers",
        verbose_name="创建人",
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_customers",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "customers_customer"
        verbose_name = "客户"
        verbose_name_plural = "客户"
        indexes = [
            models.Index(fields=["account", "is_deleted"]),
            models.Index(fields=["account", "name"]),
            models.Index(fields=["type", "status"]),
            models.Index(fields=["industry"]),
            models.Index(fields=["tier"]),
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["next_action_date"]),
            models.Index(fields=["health_score"]),
            models.Index(fields=["ltv_score"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["account", "name"], name="unique_account_customer_name"
            )
        ]

    def __str__(self):
        return self.name


class Contact(models.Model):
    GENDER_CHOICES = [
        ("male", "男"),
        ("female", "女"),
        ("other", "其他"),
    ]

    ROLE_TYPE_CHOICES = [
        ("decision_maker", "决策者"),
        ("influencer", "影响者"),
        ("user", "使用者"),
        ("gatekeeper", "把关人"),
    ]

    PREFERRED_CONTACT_CHOICES = [
        ("phone", "电话"),
        ("email", "邮件"),
        ("wechat", "微信"),
        ("visit", "拜访"),
    ]

    RELATIONSHIP_LEVEL_CHOICES = [
        ("excellent", "优秀"),
        ("good", "良好"),
        ("normal", "一般"),
        ("poor", "较差"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="contacts"
    )

    name = models.CharField(max_length=100, verbose_name="姓名")
    gender = models.CharField(
        max_length=10, choices=GENDER_CHOICES, default="other", verbose_name="性别"
    )
    job_title = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="职位"
    )
    department = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="部门"
    )
    mobile = models.CharField(
        max_length=30, null=True, blank=True, verbose_name="手机号"
    )
    phone = models.CharField(max_length=30, null=True, blank=True, verbose_name="电话")
    email = models.EmailField(null=True, blank=True, verbose_name="邮箱")
    wechat = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="微信"
    )
    role_type = models.CharField(
        max_length=20,
        choices=ROLE_TYPE_CHOICES,
        default="user",
        verbose_name="角色类型",
    )
    is_primary = models.BooleanField(default=False, verbose_name="主要联系人")
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=PREFERRED_CONTACT_CHOICES,
        default="phone",
        verbose_name="偏好联系方式",
    )
    relationship_level = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_LEVEL_CHOICES,
        default="normal",
        verbose_name="关系等级",
    )
    notes = models.TextField(null=True, blank=True, verbose_name="备注")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "customers_contact"
        verbose_name = "联系人"
        verbose_name_plural = "联系人"

    def __str__(self):
        return f"{self.name} ({self.customer.name})"


class Lead(models.Model):
    STATUS_CHOICES = [
        ("new", "新建"),
        ("contacted", "已联系"),
        ("qualified", "合格"),
        ("converted", "已转化"),
        ("invalid", "无效"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="leads")

    company_name = models.CharField(max_length=200, verbose_name="公司名称")
    contact_name = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="联系人姓名"
    )
    contact_mobile = models.CharField(
        max_length=30, null=True, blank=True, verbose_name="联系人手机"
    )
    contact_email = models.EmailField(null=True, blank=True, verbose_name="联系人邮箱")
    source = models.CharField(max_length=50, null=True, blank=True, verbose_name="来源")
    source_detail = models.CharField(
        max_length=200, null=True, blank=True, verbose_name="来源详情"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="new", verbose_name="状态"
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_leads",
        verbose_name="负责人",
    )
    converted_to_customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="converted_leads",
        verbose_name="转化客户",
    )
    converted_at = models.DateTimeField(null=True, blank=True, verbose_name="转化时间")
    tracking_id = models.UUIDField(
        default=uuid.uuid4, db_index=True, editable=False, verbose_name="追踪ID"
    )
    notes = models.TextField(null=True, blank=True, verbose_name="备注")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "customers_lead"
        verbose_name = "线索"
        verbose_name_plural = "线索"

    def __str__(self):
        return f"{self.company_name} ({self.status})"


class CustomerLTVProfile(models.Model):
    INDUSTRY_POSITION_CHOICES = [
        ("top_500", "世界500强"),
        ("top_1000", "行业1000强"),
        ("leading", "行业领先"),
        ("regional", "区域领先"),
        ("other", "其他"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        Customer, on_delete=models.CASCADE, related_name="ltv_profile"
    )

    market_cap_billion = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="市值(亿元)",
    )
    it_investment_wan = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="IT投入(万元)",
    )
    revenue_2022_wan = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="2022年营收(万元)",
    )
    revenue_2023_wan = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="2023年营收(万元)",
    )
    revenue_2024_wan = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="2024年营收(万元)",
    )
    industry_position = models.CharField(
        max_length=50,
        choices=INDUSTRY_POSITION_CHOICES,
        null=True,
        blank=True,
        verbose_name="行业地位",
    )
    known_history_performance = models.IntegerField(
        default=0, verbose_name="历史表现评分"
    )
    past_three_years_performance = models.IntegerField(
        default=0, verbose_name="近三年表现"
    )
    future_three_years_opportunity = models.IntegerField(
        default=0, verbose_name="未来三年机会"
    )
    has_ip_guard_opportunity = models.BooleanField(
        default=False, verbose_name="有IP-Guard机会"
    )
    has_anyshare_opportunity = models.BooleanField(
        default=False, verbose_name="有AnyShare机会"
    )
    is_strategic_partner = models.BooleanField(
        default=False, verbose_name="战略合作伙伴"
    )
    can_access_decision_makers = models.BooleanField(
        default=False, verbose_name="可接触决策者"
    )
    profile_version = models.CharField(
        max_length=20, default="v1.0", verbose_name="档案版本"
    )
    data_source = models.CharField(
        max_length=50, default="manual", verbose_name="数据来源"
    )
    last_updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_ltv_profiles",
        verbose_name="更新人",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "customers_ltvprofile"
        verbose_name = "客户LTV档案"
        verbose_name_plural = "客户LTV档案"
        indexes = [
            models.Index(fields=["profile_version"]),
            models.Index(fields=["-updated_at"]),
        ]

    def __str__(self):
        return f"{self.customer.name} LTV Profile"


class CustomerLTV(models.Model):
    TIER_CHOICES = [
        ("platinum", "白金"),
        ("gold", "黄金"),
        ("silver", "白银"),
        ("bronze", "青铜"),
    ]

    ENGAGEMENT_LEVEL_CHOICES = [
        ("very_active", "非常活跃"),
        ("active", "活跃"),
        ("moderate", "一般"),
        ("at_risk", "风险"),
        ("churned", "流失"),
    ]

    DATA_COMPLETENESS_CHOICES = [
        ("sufficient", "充分"),
        ("insufficient", "不足"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        Customer, on_delete=models.CASCADE, related_name="ltv"
    )

    ltv_score = models.IntegerField(default=0, verbose_name="LTV评分")
    ltv_tier = models.CharField(
        max_length=20, choices=TIER_CHOICES, default="bronze", verbose_name="LTV等级"
    )
    explicit_value_score = models.IntegerField(default=0, verbose_name="显性价值分")
    implicit_value_score = models.IntegerField(default=0, verbose_name="隐性价值分")
    growth_value_score = models.IntegerField(default=0, verbose_name="增长价值分")
    historical_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="历史营收"
    )
    current_pipeline_value = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="当前商机价值"
    )
    predicted_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="预测营收"
    )
    purchase_frequency = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, verbose_name="购买频率"
    )
    average_order_value = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="平均订单金额"
    )
    customer_lifespan_months = models.IntegerField(
        default=0, verbose_name="客户生命周期(月)"
    )
    churn_probability = models.DecimalField(
        max_digits=5, decimal_places=4, default=0, verbose_name="流失概率"
    )
    engagement_level = models.CharField(
        max_length=20,
        choices=ENGAGEMENT_LEVEL_CHOICES,
        default="moderate",
        verbose_name="活跃度",
    )
    last_purchase_days_ago = models.IntegerField(
        null=True, blank=True, verbose_name="距上次购买天数"
    )
    nps_score = models.IntegerField(null=True, blank=True, verbose_name="NPS评分")
    data_completeness = models.CharField(
        max_length=20,
        choices=DATA_COMPLETENESS_CHOICES,
        default="insufficient",
        verbose_name="数据完整度",
    )
    calculation_method = models.CharField(
        max_length=50, default="weighted_scoring", verbose_name="计算方法"
    )
    last_calculated_at = models.DateTimeField(
        auto_now=True, verbose_name="最后计算时间"
    )
    calculated_by = models.CharField(
        max_length=50, default="system", verbose_name="计算人"
    )
    notes = models.TextField(null=True, blank=True, verbose_name="备注")

    class Meta:
        db_table = "customers_ltv"
        verbose_name = "客户LTV"
        verbose_name_plural = "客户LTV"
        indexes = [
            models.Index(fields=["-ltv_score"]),
            models.Index(fields=["ltv_tier"]),
            models.Index(fields=["engagement_level"]),
            models.Index(fields=["-historical_revenue"]),
        ]

    def __str__(self):
        return f"{self.customer.name} LTV ({self.ltv_score})"


class LTVHistory(models.Model):
    CHANGE_REASON_CHOICES = [
        ("new_purchase", "新购"),
        ("renewal", "续费"),
        ("upsell", "增购"),
        ("churn", "流失"),
        ("engagement_change", "活跃度变化"),
        ("manual_adjustment", "手动调整"),
        ("scheduled_recalc", "定期重算"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_ltv = models.ForeignKey(
        CustomerLTV, on_delete=models.CASCADE, related_name="history"
    )

    ltv_score = models.DecimalField(
        max_digits=15, decimal_places=2, verbose_name="LTV评分"
    )
    ltv_tier = models.CharField(max_length=20, verbose_name="LTV等级")
    engagement_level = models.CharField(max_length=20, verbose_name="活跃度")
    change_reason = models.CharField(
        max_length=50, choices=CHANGE_REASON_CHOICES, verbose_name="变化原因"
    )
    change_detail = models.TextField(null=True, blank=True, verbose_name="变化详情")
    recorded_at = models.DateTimeField(auto_now_add=True, verbose_name="记录时间")

    class Meta:
        db_table = "customers_ltvhistory"
        verbose_name = "LTV历史"
        verbose_name_plural = "LTV历史"
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["customer_ltv", "-recorded_at"]),
        ]

    def __str__(self):
        return (
            f"{self.customer_ltv.customer.name} - {self.recorded_at}: {self.ltv_score}"
        )


class CustomerPool(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="customer_pools",
        verbose_name="账户",
    )
    name = models.CharField(max_length=100, verbose_name="池名称")
    description = models.TextField(null=True, blank=True, verbose_name="描述")
    rules = models.JSONField(default=dict, verbose_name="规则")
    allowed_roles = models.JSONField(default=list, verbose_name="允许角色")
    allowed_departments = models.JSONField(default=list, verbose_name="允许部门")
    is_active = models.BooleanField(default=True, verbose_name="是否激活")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        db_table = "customers_pool"
        verbose_name = "客户池"
        verbose_name_plural = "客户池"

    def __str__(self):
        return self.name


class PoolCustomer(models.Model):
    RECYCLED_REASON_CHOICES = [
        ("timeout", "超时"),
        ("no_progress", "无进展"),
        ("manual", "手动"),
        ("leave", "离职"),
    ]

    STATUS_CHOICES = [
        ("available", "可领取"),
        ("claimed", "已认领"),
        ("protected", "保护期"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pool = models.ForeignKey(
        CustomerPool,
        on_delete=models.CASCADE,
        related_name="pool_customers",
        verbose_name="客户池",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="pool_memberships",
        verbose_name="客户",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pool_owned_customers",
        verbose_name="负责人",
    )
    recycled_at = models.DateTimeField(auto_now_add=True, verbose_name="回池时间")
    recycled_reason = models.CharField(
        max_length=20,
        choices=RECYCLED_REASON_CHOICES,
        null=True,
        blank=True,
        verbose_name="回池原因",
    )
    previous_owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="previous_pool_customers",
        verbose_name="原负责人",
    )
    claimed_at = models.DateTimeField(null=True, blank=True, verbose_name="认领时间")
    claimed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claimed_customers",
        verbose_name="认领人",
    )
    protection_until = models.DateTimeField(
        null=True, blank=True, verbose_name="保护期至"
    )
    last_released_at = models.DateTimeField(
        null=True, blank=True, verbose_name="最后释放时间"
    )
    last_claimed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="最后认领时间"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="available", verbose_name="状态"
    )

    class Meta:
        db_table = "customers_poolcustomer"
        verbose_name = "客户池成员"
        verbose_name_plural = "客户池成员"
        unique_together = [["pool", "customer"]]

    def __str__(self):
        return f"{self.customer.name} in {self.pool.name}"
