# CRM系统设计方案 - 最终审查报告

审查日期: 2026-01-23
审查人: OpenCode
文档版本: 优化后版本
审查范围: 数据模型、索引设计、外键关系、公海池设计、权限矩阵、LTV逻辑

---

## overallAssessment

**良好** - 设计文档整体结构完整，已采纳优化建议并修复关键问题。核心数据模型设计合理，索引配置较为完善，LTV逻辑已修正。仍存在少量需完善的细节和实施时需要明确的业务逻辑。

---

## strengths

### 1. 数据模型完整性显著提升

**团队层级支持** (User模型):
- ✅ 新增 `manager` 字段：支持多层级管理关系
- ✅ 新增 `feishu_team_id` 字段：与飞书组织架构无缝集成
- ✅ `related_name='team_members'`：便于逆向查询团队成员

**公海池设计完善** (Customer/PoolCustomer模型):
- ✅ Customer新增 `current_pool` 和 `pool_entered_at`：快速判断客户池状态，避免关联查询
- ✅ PoolCustomer新增关键字段：
  - `owner`：支持"本团队"权限判断
  - `protection_until`：保护期明确追踪
  - `last_released_at` / `last_claimed_at`：冷却期逻辑可执行
- ✅ `unique_together=['pool', 'customer']`：防止重复入池

**线索-商机链路追踪** (Lead/Opportunity模型):
- ✅ Lead新增 `tracking_id`：生成唯一标识
- ✅ Opportunity新增 `source_tracking_id`：保留链路追踪能力
- ✅ Opportunity新增 `converted_from_lead` FK：ORM操作更高效
- ✅ 双重设计：tracking_id用于跨实体分析，FK用于快速查询

### 2. 索引设计合理且全面

**Customer模型索引** (Lines 217-229):
```python
indexes = [
    Index(fields=['account', 'is_deleted']),      # 软删除查询优化
    Index(fields=['account', 'name']),            # 租户内客户名称查询
    Index(fields=['type', 'status']),             # 分类+状态筛选
    Index(fields=['industry']),                   # 行业分组统计
    Index(fields=['tier']),                      # 客户分层分析
    Index(fields=['owner', 'status']),            # 经理团队数据范围
    Index(fields=['next_action_date']),            # 待办任务查询
    Index(fields=['health_score']),               # 健康度排序
]
constraints = [
    UniqueConstraint(fields=['account', 'name'])    # 租户内客户名称唯一性
]
```
**评价**: 覆盖典型查询场景，组合索引合理，约束明确。

**Opportunity模型索引** (Lines 402-410):
```python
indexes = [
    Index(fields=['customer', 'stage']),           # 客户商机管道视图
    Index(fields=['owner', 'stage']),              # 销售人员商机管道
    Index(fields=['stage', 'probability']),        # 阶段-概率分析（新增）
    Index(fields=['amount']),                      # 金额排序（新增）
    Index(fields=['product_line']),                # 产品线统计（新增）
    Index(fields=['expected_close_date']),         # 预计成交日期查询
]
```
**评价**: 新增的3个索引直接回应性能需求，支持报表和分析场景。

**Activity模型索引** (Lines 468-476):
```python
indexes = [
    Index(fields=['customer', 'activity_date']),   # 客户跟进历史查询
    Index(fields=['owner', 'activity_date']),      # 销售人员工作日志
    Index(fields=['type']),                        # 活动类型筛选（新增）
    Index(fields=['direction']),                   # 来电/外呼分析（新增）
    Index(fields=['activity_date']),               # 活动时间排序
    Index(fields=['next_action_date']),            # 待办任务提醒
]
```
**评价**: 覆盖跟进记录主要查询维度，新增索引支持分析报表。

### 3. 外键关系设计规范

**级联删除策略合理**:
- `Account → User/Customer/Lead`: CASCADE ✅（租户删除时清理所有数据）
- `Customer → Contact/Opportunity/Activity`: CASCADE ✅（客户删除时级联清理）
- `Opportunity → Activity`: SET_NULL ✅（商机删除时保留活动记录）
- `Opportunity → converted_from_lead`: SET_NULL ✅（线索删除时商机仍存在）

**多对多关系清晰**:
- `Customer.team_members`: ManyToMany(User) ✅
- `Opportunity.team_members`: ManyToMany(User) ✅
- `Activity.participants`: ManyToMany(User) ✅

**反向关联命名规范**:
- `User.owned_customers` / `User.team_customers` ✅
- `User.owned_opportunities` / `User.team_opportunities` ✅
- `Lead.converted_opportunities` ✅

**评价**: 外键设计遵循Django最佳实践，级联策略合理，命名清晰。

### 4. LTV逻辑已修正并明确

**问题已修复**:
- ✅ Line 678: 明确声明"LTV最终结果为纯评分（0-100分），不涉及货币金额计算"
- ✅ Line 678: 公式改为 `LTV评分 = (显性价值 × 0.4) + (隐性价值 × 0.4) + (增长价值 × 0.2)`
- ✅ Line 714-718: 数据完整性阈值改为40%（`completeness_ratio < 0.4`）

**分层逻辑清晰**:
```python
if ltv_score >= 80: ltv_tier = 'platinum'  # 白金客户 (80-100分)
elif ltv_score >= 60: ltv_tier = 'gold'      # 黄金客户 (60-79分)
elif ltv_score >= 40: ltv_tier = 'silver'    # 白银客户 (40-59分)
else: ltv_tier = 'bronze'    # 青铜客户 (0-39分)
```

**评价**: 评分制逻辑已统一，阈值已调整，与用户决策一致。

### 5. 公海池设计完整且可执行

**回收字段齐全**:
- `recycled_at`: 自动记录回收时间
- `recycled_reason`: 明确回收原因（超时/无进展/手动/离职）
- `previous_owner`: 保留原负责人信息

**保护期机制**:
- `protection_until`: 明确保护期到期时间
- `status`: 包含'protected'状态
- **可执行**: 系统可根据当前时间与protection_until判断是否仍受保护

**冷却期追踪**:
- `last_released_at`: 记录最后释放时间
- `last_claimed_at`: 记录最后领取时间
- **可执行**: 计算距上次释放天数，判断是否过7天冷却期

**评价**: 公海池设计已包含所有必要字段，回收/领取/保护期规则可实际执行。

---

## concerns

### 1. Customer模型缺少LTV输入字段（严重）

**问题**: LTV计算逻辑中使用的字段未在Customer模型中定义

**缺失字段** (Lines 748-868提到但模型中缺失):
```python
# 需要添加到Customer模型：
market_cap_billion = DecimalField(max_digits=15, decimal_places=2, null=True)
it_investment_wan = DecimalField(max_digits=15, decimal_places=2, null=True)
revenue_2022_wan = DecimalField(max_digits=15, decimal_places=2, null=True)
revenue_2023_wan = DecimalField(max_digits=15, decimal_places=2, null=True)
revenue_2024_wan = DecimalField(max_digits=15, decimal_places=2, null=True)
industry_position = CharField(max_length=50, null=True)
known_history_performance = IntegerField(default=0)
past_three_years_performance = IntegerField(default=0)
future_three_years_opportunity = IntegerField(default=0)
has_large_product_purchase = BooleanField(default=False)
is_strategic_partner = BooleanField(default=False)
can_access_decision_makers = BooleanField(default=False)
```

**影响**: LTV计算时无法获取输入数据，导致评分无法计算

**建议**: 立即补充这些字段到Customer模型定义中（Lines 126-230）

### 2. PoolCustomer缺少CustomerPool外键的account级联

**问题**: PoolCustomer通过`pool` FK关联CustomerPool，但没有account字段

**当前设计**:
```python
class PoolCustomer(models.Model):
    pool = ForeignKey(CustomerPool, on_delete=CASCADE)  # CustomerPool有account字段
    customer = ForeignKey(Customer, on_delete=CASCADE)    # Customer有account字段
```

**潜在问题**:
- 级联删除: CustomerPool删除时，CustomerPool.account也会删除（正确）
- 但PoolCustomer记录会级联删除，这是预期行为
- **数据隔离**: 如果两个不同account的CustomerPool同名（虽然不太可能），可能导致混淆

**建议**:
```python
class PoolCustomer(models.Model):
    pool = ForeignKey(CustomerPool, on_delete=CASCADE)
    customer = ForeignKey(Customer, on_delete=CASCADE)
    account = ForeignKey(Account, on_delete=CASCADE)  # 冗余但确保数据隔离

    class Meta:
        unique_together = ['account', 'pool', 'customer']  # 更严格
```

### 3. Customer模型unified_social_credit_code重复定义

**问题**: 字段在两处定义，可能产生歧义

**位置**:
- Line 33: `unified_social_credit_code = CharField(max_length=50, null=True)`
- Line 984 (集成架构章节): `unified_social_credit_code = CharField(max_length=50, unique=True, null=True)`

**差异**:
- Line 33: **没有unique约束**
- Line 984: **有unique约束**

**影响**: 导致设计文档内部不一致，实际实现时应使用哪个版本？

**建议**: 如果客户名称已通过UniqueConstraint(account, name)保证唯一，建议统一社会信用代码设为unique=True
- 统一两处定义，删除集成架构章节中的重复模型定义
- 或明确标注"这是集成扩展字段，基础模型中定义为主"

### 4. 权限矩阵缺少关键定义

**问题1: 导出权限未定义**

当前权限矩阵中无任何关于数据导出的规定：

| 功能 | 管理员 | 销售经理 | 销售人员 | 售前支持 | 售后支持 | 只读用户 |
|-----|--------|---------|---------|---------|---------|---------|---------|
| CSV导出 | ? | ? | ? | ? | ? | ? |

**影响**: 数据安全风险，无导出限制机制

**建议**: 补充导出权限规则
- 管理员: 可导出所有数据
- 销售经理: 可导出本团队数据
- 其他角色: 可导出自己可见的数据
- 所有角色: 导出时自动过滤敏感字段（如佣金）

**问题2: 售前"部分字段"未明确**

当前仅说明"部分字段可编辑"，但无明确字段列表

**建议**: 明确列出
```python
PRESALES_EDITABLE_FIELDS = {
    'opportunity': ['description', 'competitive_advantage', 'notes'],
    'activity': ['content', 'outcome', 'duration_minutes'],
}
PRESALES_READONLY_FIELDS = {
    'opportunity': ['amount', 'probability', 'stage', 'expected_close_date'],
}
```

**问题3: 团队成员判断逻辑未定义**

"本团队"权限依赖团队成员关系判断，但文档中未明确定义

**建议**: 补充逻辑说明
```python
def is_team_member(user: User, target: User) -> bool:
    # 方案1: 基于飞书team_id
    if user.feishu_team_id and target.feishu_team_id:
        return user.feishu_team_id == target.feishu_team_id

    # 方案2: 基于manager层级（多级支持）
    if is_subordinate(user, target):
        return True

    # 方案3: 基于客户协作
    return Customer.objects.filter(
        owner=user,
        team_members__contains=target
    ).exists()
```

### 5. LTV计算逻辑中的Revenue字段命名不一致

**问题**: LTV评分说明中使用的字段名与实际不一致

**评分说明中** (Line 833):
```python
revenue_cagr = calculate_cagr(revenue_2022, revenue_2024)
```

**但模型中字段名为**:
```python
revenue_2022_wan = DecimalField(null=True)
revenue_2023_wan = DecimalField(null=True)
revenue_2024_wan = DecimalField(null=True)
```

**影响**: 代码实现时会产生命名错误

**建议**: 统一字段命名或说明单位换算
```python
# 方案1: 修改字段名（推荐）
revenue_2022 = DecimalField(max_digits=15, decimal_places=2, null=True)
revenue_2023 = DecimalField(max_digits=15, decimal_places=2, null=True)
revenue_2024 = DecimalField(max_digits=15, decimal_places=2, null=True)

# 方案2: 修改计算说明
revenue_cagr = calculate_cagr(revenue_2022_wan / 10000, revenue_2024_wan / 10000)
```

### 6. LTV触发时机中的货币单位混淆

**问题**: Line 879提到"LTV > 50万"，但LTV是评分不是货币

**当前**:
```python
# 每周一重算高价值客户(LTV > 50万)
```

**应为**:
```python
# 每周一重算高价值客户(ltv_tier in ['platinum', 'gold'])
# 或者改为 revenue-based
# 每周一重算高价值客户(historical_revenue > 500000)
```

**建议**: 明确判断条件是基于LTV评分分层还是实际营收金额

### 7. 公海池业务规则细节不明确（中）

**问题**: 文档仅定义模型字段，缺少可执行的业务规则

当前设计：
- CustomerPool模型：定义了`allowed_roles`、`allowed_departments`、`rules`（JSONField）字段
- PoolCustomer模型：定义了回收/领取/保护期相关字段（recycled_at、claimed_at、protection_until、last_released_at、last_claimed_at）
- 计划文件（abundant-humming-moon.md）提到了回收规则（30/60/90天）、领取规则（50上限、5/天）、冷却期（7天）、保护期（15天）

**缺失内容**：
- 回收触发条件：什么操作算"超时未跟进"？last_contact_date更新标准？
- 领取权限检查：如何判断用户是否在允许的角色/部门中？
- 保护期自动延长：何时触发？什么算"活跃跟进"？延长多少天？
- 冷却期计算：从何时开始计算？
- 通知机制：回收前是否提前通知？通知方式？

**影响**: 公海池功能开发时需要重新设计业务规则，可能返工

**建议**: 在设计文档或独立业务规则文档中明确上述规则

---

## recommendations

### 1. 立即补充Customer模型LTV输入字段（优先级：严重）

```python
class Customer(models.Model):
    # ... 现有字段 ...

    # 新增LTV输入字段
    market_cap_billion = DecimalField(max_digits=15, decimal_places=2, null=True)
    it_investment_wan = DecimalField(max_digits=15, decimal_places=2, null=True)
    revenue_2022 = DecimalField(max_digits=15, decimal_places=2, null=True)
    revenue_2023 = DecimalField(max_digits=15, decimal_places=2, null=True)
    revenue_2024 = DecimalField(max_digits=15, decimal_places=2, null=True)
    industry_position = CharField(max_length=50, null=True)
    known_history_performance = IntegerField(default=0)
    past_three_years_performance = IntegerField(default=0)
    future_three_years_opportunity = IntegerField(default=0)
    has_large_product_purchase = BooleanField(default=False)
    is_strategic_partner = BooleanField(default=False)
    can_access_decision_makers = BooleanField(default=False)

    # 保留索引和约束
    class Meta:
        indexes = [...]
        constraints = [...]
```

### 2. 补充权限矩阵关键定义（优先级：中）

```python
# 权限矩阵补充
PERMISSION_MATRIX = {
    'admin': {
        'export': ['all'],
        'view': ['all_data'],
        'edit': ['all_data'],
        'delete': ['all_data'],
    },
    'sales_manager': {
        'export': ['team_data'],
        'view': ['team_data'],
        'edit': ['team_data'],
        'delete': ['none'],
    },
    'sales': {
        'export': ['owned_data'],
        'view': ['owned_data'],
        'edit': ['owned_data'],
        'delete': ['owned_activities'],
    },
    'presales': {
        'export': ['related_data'],
        'view': ['related_opportunities'],
        'edit': ['presales_editable_fields'],
        'delete': ['none'],
    },
    'aftersales': {
        'export': ['related_data'],
        'view': ['related_customers'],
        'edit': ['activities_only'],
        'delete': ['none'],
    },
    'viewer': {
        'export': ['none'],
        'view': ['owned_data'],
        'edit': ['none'],
        'delete': ['none'],
    },
}

PRESALES_EDITABLE_FIELDS = {
    'opportunity': ['description', 'competitive_advantage', 'notes'],
}
PRESALES_READONLY_FIELDS = {
    'opportunity': ['amount', 'probability', 'stage', 'expected_close_date'],
}
```

### 3. 补充团队成员判断逻辑（优先级：中）

建议采用组合方式：
```python
def is_team_member(user: User, target: User) -> bool:
    """判断用户是否为团队成员"""
    # 1. 飞书团队ID（最准确）
    if user.feishu_team_id and user.feishu_team_id == target.feishu_team_id:
        return True

    # 2. 经理层级关系（支持多级）
    if is_subordinate(user, target):
        return True

    # 3. 客户协作关系
    if Customer.objects.filter(owner=user, team_members__id=target.id).exists():
        return True

    return False

def is_subordinate(manager: User, user: User) -> bool:
    """递归检查用户是否为下级"""
    current = user.manager_id
    while current:
        if current.id == manager.id:
            return True
        current = current.manager_id
    return False
```

### 4. 明确LTV触发时机条件（优先级：低）

```python
# 修正前
# 每周一重算高价值客户(LTV > 50万)

# 修正后 - 方案1（基于分层）
@shared_task
def recalc_high_value_ltv_weekly():
    """每周一重算高价值客户"""
    CustomerLTV.objects.filter(
        ltv_tier__in=['platinum', 'gold']
    ).update(
        calculation_method='scheduled_recalc',
        last_calculated_at=timezone.now()
    )
    # 触发重算逻辑...

# 修正后 - 方案2（基于营收）
@shared_task
def recalc_high_value_revenue_weekly():
    """每周一重算高价值客户（基于营收）"""
    high_revenue_customers = Customer.objects.annotate(
        total_revenue=Sum('opportunities__actual_amount')
    ).filter(
        total_revenue__gte=Decimal('500000')
    )
    for customer in high_revenue_customers:
        recalculate_ltv(customer)
```

### 5. 补充公海池业务逻辑说明（优先级：中）

建议在设计文档中明确以下逻辑：

**回收逻辑**:
```python
def check_and_recycle_customers():
    """每日检查并回收客户"""
    # 超时未跟进（30天）
    customers = Customer.objects.filter(
        owner__isnull=False,
        last_contact_date__lt=timezone.now() - timedelta(days=30),
        current_pool__isnull=True  # 未在池中
    )
    for customer in customers:
        recycle_to_pool(customer, 'timeout')

    # 长期无进展（60天）
    customers = Customer.objects.filter(
        owner__isnull=False,
        opportunities__stage__in=['qualification', 'proposal'],
        updated_at__lt=timezone.now() - timedelta(days=60)
    ).distinct()
    for customer in customers:
        recycle_to_pool(customer, 'no_progress')

    # 无有效商机（90天）
    customers = Customer.objects.filter(
        owner__isnull=False,
        opportunities__status__in=['closed_lost', 'on_hold']
    ).annotate(
        days_since_last_win=Max('opportunities__actual_close_date')
    ).filter(days_since_last_win__lt=timezone.now() - timedelta(days=90))
    for customer in customers:
        recycle_to_pool(customer, 'no_progress')

def recycle_to_pool(customer: Customer, reason: str):
    """回收客户到公海池"""
    # 1. 创建PoolCustomer记录
    PoolCustomer.objects.create(
        pool=get_default_pool(),
        customer=customer,
        owner=customer.owner,
        recycled_reason=reason,
        previous_owner=customer.owner,
        status='available'
    )

    # 2. 更新Customer状态
    customer.owner = None
    customer.current_pool = get_default_pool()
    customer.pool_entered_at = timezone.now()
    customer.save()
```

**领取逻辑**:
```python
def can_claim_customer(user: User, customer: Customer) -> tuple[bool, str]:
    """检查用户是否可以领取客户"""
    # 角色检查
    if user.role not in ['admin', 'sales_manager', 'sales']:
        return False, "无领取权限"

    # 持有数限制（50个）
    if user.owned_customers.filter(current_pool__isnull=True).count() >= 50:
        return False, "已达到持有上限(50个)"

    # 每日限制（5个）
    today = timezone.now().date()
    if user.claimed_customers.filter(claimed_at__date=today).count() >= 5:
        return False, "今日已达到领取上限(5个)"

    # 冷却期检查（7天）
    pool_customer = PoolCustomer.objects.filter(
        customer=customer,
        previous_owner=user
    ).first()
    if pool_customer and pool_customer.last_released_at:
        cooldown_days = (timezone.now() - pool_customer.last_released_at).days
        if cooldown_days < 7:
            return False, f"冷却期未满(剩余{7-cooldown_days}天)"

    return True, "可以领取"

def claim_customer(user: User, customer: Customer):
    """领取客户"""
    # 1. 更新Customer
    customer.owner = user
    customer.current_pool = None
    customer.pool_entered_at = None
    customer.save()

    # 2. 更新PoolCustomer
    pool_customer = customer.poolcustomer_set.first()
    if pool_customer:
        pool_customer.status = 'claimed'
        pool_customer.claimed_by = user
        pool_customer.claimed_at = timezone.now()
        pool_customer.protection_until = timezone.now() + timedelta(days=15)
        pool_customer.save()

    # 3. 创建跟进记录
    Activity.objects.create(
        customer=customer,
        user=user,
        type='claim',
        content=f'从公海池领取客户',
        activity_date=timezone.now()
    )
```

### 6. 补充字段级权限控制实现建议（优先级：中）

```python
# serializers.py
class OpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = '__all__'

    def get_fields(self):
        """根据用户角色动态返回字段"""
        request = self.context.get('request')
        user = request.user

        if user.role == 'presales':
            # 售前支持：只能编辑部分字段
            return [
                'id', 'name', 'description',
                'competitive_advantage', 'notes',
                'customer', 'owner', 'team_members',
            ]
        elif user.role == 'aftersales':
            # 售后支持：只读
            return [
                'id', 'name', 'description',
                'customer', 'owner', 'actual_close_date',
            ]
        return super().get_fields()

    def to_representation(self, instance):
        """根据权限过滤敏感字段"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user

        # 敏感字段：金额仅对负责人、经理、管理员可见
        if user not in [instance.owner, get_manager(instance.owner)] and user.role != 'admin':
            data.pop('amount', None)
            data.pop('actual_amount', None)

        # 敏感字段：佣金仅对负责人、管理员可见
        if user != instance.owner and user.role != 'admin':
            data.pop('commission_info', None)

        return data
```

### 7. 建议补充缺失的索引（优先级：低）

虽然当前索引已较完善，但以下场景可考虑补充：

```python
# Customer模型新增
Index(fields=['created_at']),  # 新客户趋势分析

# Opportunity模型新增
Index(fields=['created_at']),  # 新商机趋势分析
Index(fields=['owner', 'created_at']),  # 销售人员商机漏斗

# Activity模型新增
Index(fields=['customer', 'type']),  # 客户活动类型统计
```

---

## 总结

### 已完成的优化 ✅
1. User模型添加manager和feishu_team_id字段
2. Customer模型添加current_pool和pool_entered_at字段
3. Customer模型添加5个新索引和1个UniqueConstraint
4. Lead模型添加tracking_id字段
5. Opportunity模型添加source_tracking_id和converted_from_lead字段
6. Opportunity模型添加4个新索引
7. Activity模型添加3个新索引
8. LTV阈值从80%改为40%
9. LTV逻辑明确为纯评分制（0-100分）
10. PoolCustomer模型添加owner、protection_until、last_released_at、last_claimed_at字段

### 待完善的问题 ⚠️
1. **严重**: Customer模型缺少11个LTV输入字段
2. **高**: 统一unified_social_credit_code定义，删除重复
3. **中**: 补充导出权限定义
4. **中**: 明确售前"部分字段"列表
5. **中**: 补充团队成员判断逻辑说明
6. **低**: 修正LTV触发时机货币单位混淆
7. **低**: 明确公海池保护期自动延长规则

### 设计质量评分

| 维度 | 评分 | 说明 |
|-----|------|------|
| 数据模型完整性 | 85/100 | 核心模型完整，但LTV输入字段缺失 |
| 外键关系设计 | 95/100 | 级联策略合理，命名规范 |
| 索引设计 | 90/100 | 覆盖主要查询场景，可进一步优化 |
| 公海池设计 | 90/100 | 字段完整，业务逻辑需补充说明 |
| 权限矩阵 | 70/100 | 框架清晰，但缺少关键字段级权限定义 |
| LTV逻辑清晰度 | 95/100 | 逻辑已修正并明确，字段命名需统一 |
| **总体评分** | **87.5/100** | **良好** |

---

## 实施建议

### Phase 0: 文档修复（立即）
- [ ] 补充Customer模型LTV输入字段
- [ ] 统一unified_social_credit_code定义
- [ ] 修正拼写错误

### Phase 1: 权限实现（Week 1-2）
- [ ] 定义完整权限矩阵（含导出权限）
- [ ] 实现团队成员判断逻辑
- [ ] 定义售前可编辑字段列表
- [ ] 实现字段级权限控制

### Phase 2: 公海池逻辑（Week 3-4）
- [ ] 实现回收定时任务
- [ ] 实现领取权限检查
- [ ] 实现保护期自动延长
- [ ] 实现冷却期检查

### Phase 3: LTV计算（Week 5-6）
- [ ] 统一Revenue字段命名
- [ ] 实现数据完整性检查
- [ ] 实现LTV评分计算
- [ ] 实现定期重算任务
