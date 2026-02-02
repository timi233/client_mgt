# CRM系统设计方案 - 实施可行性最终审查

审查日期: 2026-01-23
审查人: OpenCode
文档版本: 优化后版本
审查维度: 业务逻辑、公海池规则、权限设计、前端实现、实施计划、测试策略

---

## overallAssessment

**良好** - 设计方案整体架构合理，业务逻辑完整，公海池和LTV设计可执行。权限框架清晰但需补充细节。实施计划基本可行但时间紧张。建议在开发前补充关键业务规则定义和权限细节。

---

## strengths

### 1. 业务逻辑架构完整

**实体关系清晰**:
- ✅ 10个核心模型覆盖CRM主要业务场景
- ✅ 多租户支持（Account）隔离企业数据
- ✅ 线索→客户→商机的转化路径完整
- ✅ 追踪机制：Lead.tracking_id + Opportunity.source_tracking_id + Opportunity.converted_from_lead 三重设计

**LTV计算逻辑清晰**:
- ✅ 明确为纯评分制（0-100分），已修正之前的货币混淆
- ✅ 三维度评分：显性价值40% + 隐性价值40% + 增长价值20%
- ✅ 分层明确：白金(80-100) / 黄金(60-79) / 白银(40-59) / 青铜(0-39)
- ✅ 数据完整性阈值已修正：40%完整度（原80%错误）
- ✅ 分离评分与实际营收：historical_revenue、current_pipeline_value、predicted_revenue独立追踪

**公海池业务流程完整**:
- ✅ 双模型设计：CustomerPool（池配置）+ PoolCustomer（池内客户）
- ✅ Customer.current_pool快速查询，避免关联性能损耗
- ✅ 回收场景全覆盖：超时未跟进（30天）+ 长期无进展（60天）+ 无有效商机（90天）+ 员工离职
- ✅ 领取规则完整：角色限制 + 持有上限（50个）+ 每日上限（5个）+ 冷却期（7天）
- ✅ 保护期追踪：protection_until字段 + status='protected'

**系统集成架构合理**:
- ✅ 三系统集成：渠道 + 派工 + 订单（预留）
- ✅ 双向同步：CRM ↔ 外部系统
- ✅ 事件驱动：Django Signals + Celery + Message Queue
- ✅ 幂等性设计：使用业务唯一标识防止重复
- ✅ 冲突解决：时间戳 + 主系统优先 + 人工介入

### 2. 数据库设计完善

**索引覆盖主要查询场景**:
```python
Customer: 8个索引
  - account+is_deleted（软删除查询）
  - account+name（客户名称搜索）
  - type+status（客户分类筛选）
  - industry（行业统计）
  - tier（客户分层）
  - owner+status（团队数据）
  - next_action_date（待办提醒）
  - health_score（健康度排序）
  + UniqueConstraint(account, name)（租户内唯一）

Opportunity: 6个索引
  - customer+stage（客户商机管道）
  - owner+stage（销售人员管道）
  - stage+probability（阶段概率分析）
  - amount（金额排序）
  - product_line（产品线统计）
  - expected_close_date（预计成交查询）

Activity: 6个索引
  - customer+activity_date（客户跟进历史）
  - owner+activity_date（销售人员日志）
  - type（活动类型筛选）
  - direction（来电/外呼分析）
  - activity_date（活动时间排序）
  - next_action_date（待办提醒）
```

**评价**: 索引设计覆盖90%+主要查询场景，性能基础扎实。

**外键关系规范**:
- CASCADE策略合理（Account → User/Customer/Lead，Customer → Contact/Opportunity/Activity）
- SET_NULL策略恰当（Opportunity → Activity，User软删除相关）
- 反向关联命名清晰（owned_customers/team_customers, owned_opportunities/team_opportunities）

### 3. 公海池规则可执行性强

**回收规则具体且可执行**:
```python
# 可执行性分析
规则1: 超时未跟进（30天）
  ✅ Customer.last_contact_date 字段存在
  ✅ 可定时任务每日检查：Customer.objects.filter(
         owner__isnull=False,
         last_contact_date__lt=timezone.now() - timedelta(days=30)
    )
  ✅ 可提前7天通知负责人

规则2: 长期无进展（60天）
  ✅ Opportunity.stage变更被StageHistory记录
  ✅ 可通过max(changed_at)判断在当前阶段停留时间
  ✅ 可定时任务每日检查

规则3: 无有效商机（90天）
  ✅ 可查询Customer.opportunities.filter(stage__in=['closed_lost', 'on_hold'])
  ✅ 计算距最近赢单天数

规则4: 员工离职
  ✅ User.is_active字段存在
  ✅ 可通过飞书webhook触发自动回收
```

**领取规则可执行**:
```python
# 可执行性分析
检查1: 角色限制
  ✅ PoolCustomer.pool.allowed_roles 字段存在
  ✅ User.role字段存在
  ✅ 可检查user.role in pool.allowed_roles

检查2: 持有上限（50个）
  ✅ Customer.owner字段存在
  ✅ 可查询：User.owned_customers.count()

检查3: 每日上限（5个）
  ✅ PoolCustomer.claimed_at字段存在
  ✅ 可查询：PoolCustomer.objects.filter(
         claimed_by=user,
         claimed_at__date=today
    ).count()

检查4: 冷却期（7天）
  ✅ PoolCustomer.last_released_at字段存在
  ✅ 可计算：(timezone.now() - last_released_at).days
  ✅ 可判断：>= 7天
```

**保护期逻辑可执行**:
```python
# 可执行性分析
保护期设置：
  ✅ PoolCustomer.protection_until字段存在
  ✅ 可设置：protection_until = now + timedelta(days=15)

保护期检查：
  ✅ 可判断：now < protection_until
  ✅ 在回收/领取时检查status='protected'

自动延长（文档提到但逻辑未明确定义）：
  ❓ 需明确：什么算"活跃跟进"？
    - 新增Activity？ Activity.type in [call, visit, demo, meeting]？
    - 更新Opportunity？ Opportunity.stage变更？
    - 更新Customer？ Customer.last_contact_date变更？
```

### 4. LTV计算逻辑清晰且修正

**已修正的问题**:
- ✅ Line 678：明确声明"LTV最终结果为纯评分（0-100分），不涉及货币金额计算"
- ✅ Line 678：公式改为 `LTV评分 = (显性价值 × 0.4) + (隐性价值 × 0.4) + (增长价值 × 0.2)`
- ✅ Line 714-718：数据完整性阈值改为40%（`completeness_ratio < 0.4`）

**评分逻辑可执行**:
```python
# 可执行性分析
显性价值（0-40分）：
  ✅ 权重明确：历史30% + 过去3年50% + 未来3年20%
  ✅ 大单奖励：has_large_product_purchase时+30分
  ✅ 上限控制：min(explicit_value, 40)

隐性价值（0-40分）：
  ✅ 行业地位：Top500=15分，市值>100亿=12分，>10亿=8分
  ✅ 企业规模：员工>1万=8分，>1千=5分
  ✅ IT投资：>1000万=7分，>100万=4分
  ✅ 合作关系：战略伙伴=5分，可接触决策人=5分
  ✅ 上限控制：min(implicit_value, 40)

增长价值（0-20分）：
  ✅ 商机类型：IP-Guard=5分，AnyShare=5分
  ✅ 财务增长：CAGR>30%=10分，>15%=6分，>0%=3分
  ✅ 上限控制：min(growth_value, 20)
```

**问题**: Customer模型缺少LTV输入字段（见concerns部分）

### 5. 团队层级支持完善

**User模型新增字段**:
- ✅ manager：自关联，支持多级管理关系
- ✅ feishu_team_id：飞书团队ID
- ✅ manager.related_name='team_members'：便于逆向查询

**可实现的权限判断**:
```python
# 基于manager_id的递归查询
def is_subordinate(manager, user):
    current = user.manager_id
    while current:
        if current.id == manager.id:
            return True
        current = current.manager_id
    return False

# 基于feishu_team_id的同团队判断
def is_same_team(user, target):
    return user.feishu_team_id == target.feishu_team_id
```

---

## concerns

### 1. Customer模型缺少LTV输入字段（严重）

**问题描述**: LTV计算逻辑中使用的字段未在Customer模型中定义

**缺失字段**（Lines 848-867提到但模型中缺失）:
```python
# 需要添加到Customer模型（Lines 126-230）
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

**影响**:
- LTV评分计算无法获取输入数据
- CustomerLTV.historical_revenue、current_pipeline_value、predicted_revenue无法计算
- 智能提醒系统无法工作（LTV分层判断）
- 销售策略推荐无法实施

**优先级**: **严重** - 必须在开发前补充

### 2. 权限矩阵缺少关键定义（高）

**问题1: 导出权限未定义**

当前权限矩阵中无任何关于数据导出的规定：

| 功能 | 管理员 | 销售经理 | 销售人员 | 售前支持 | 售后支持 | 只读用户 |
|-----|--------|---------|---------|---------|---------|---------|
| CSV导出 | ? | ? | ? | ? | ? | ? |

**风险**: 数据安全风险，无导出限制机制
**建议**: 补充导出权限规则
- 管理员：可导出所有数据
- 销售经理：可导出本团队数据
- 其他角色：可导出自己可见的数据
- 所有角色：导出时自动过滤敏感字段（如佣金）

**问题2: 售前"部分字段"未明确**

当前仅说明"部分字段可编辑"，但无明确字段列表
**风险**: 前后端实现可能不一致
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
**风险**: "销售经理只能查看本下属团队的客户"无法实现
**建议**: 补充逻辑说明（见recommendations部分）

### 3. 公海池业务规则细节不明确（中）

**问题: 保护期自动延长规则不明确**

文档提到（Line 819-823）：
```python
# 有活跃跟进 - 自动延长
if customer.ltv.ltv_tier in ['platinum', 'gold'] and customer.ltv.engagement_level == 'at_risk':
    create_alert(...)
```

但"自动延长保护期"的具体规则未定义：
- 什么操作算"活跃跟进"？
  - 新增Activity？所有Activity.type？
  - 更新Opportunity？所有stage变更？
  - 更新Customer.last_contact_date？
- 延长多少天？固定15天？还是递增？
- 有上限吗？
- 是否创建Activity记录保护期延长操作？

**影响**: 保护期自动延长功能无法实现

**建议**: 明确定义
```python
def extend_protection_period(customer: Customer):
    """有活跃跟进时延长保护期"""
    pool_customer = customer.poolcustomer_set.filter(status='protected').first()
    if pool_customer and pool_customer.protection_until:
        # 延长15天（或可配置天数）
        pool_customer.protection_until = timezone.now() + timedelta(days=15)
        pool_customer.save()

        # 记录保护期延长活动
        Activity.objects.create(
            customer=customer,
            type='protection_extend',
            subject='保护期延长',
            content=f'保护期延长至{pool_customer.protection_until.date()}',
            activity_date=timezone.now(),
            owner=customer.owner
        )

def check_activity_and_extend(sender, instance, created, **kwargs):
    """监听Activity创建，判断是否延长保护期"""
    if isinstance(instance, Activity):
        customer = instance.customer
        # 如果客户在保护期中且活动类型为有效跟进
        if customer.poolcustomer_set.filter(status='protected').exists():
            if instance.type in ['call', 'visit', 'demo', 'meeting', 'proposal']:
                extend_protection_period(customer)
```

### 4. LTV触发时机单位混淆（低）

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

**建议**: 明确判断条件

### 5. 前端实现考虑不足（中）

**缺失内容**:

1. **状态管理策略未定义**
   - Redux Toolkit store结构未定义
   - 客户、商机、活动、公海池的状态管理未说明
   - 如何与后端API交互

2. **实时更新机制未说明**
   - WebSocket连接管理
   - 订阅事件（商机状态变更、LTV更新、公海池客户释放）
   - 断线重连策略

3. **表单验证规则未明确**
   - 客户表单：必填字段、格式验证
   - 商机表单：金额验证、日期验证
   - 权限字段验证（根据用户角色动态显示/隐藏字段）

4. **LTV展示细节未定义**
   - LtvBadge组件如何获取LTV评分
   - 数据不足时显示什么？文档说"数据不足，无法评估"
   - 评分详情弹窗显示哪些信息？

5. **公海池前端流程未设计**
   - 客户列表如何标识在公海池中
   - 领取操作：弹窗确认、冷却期提示
   - 释放操作：原因选择、团队成员权限检查
   - 保护期视觉提示：在客户卡片上显示"保护中"状态

### 6. 实施计划时间紧张（中）

**当前计划**: 12周完成所有功能
- Week 1-2: 后端基础架构
- Week 3-4: 核心功能开发（RESTful API + LTV + 飞书认证）
- Week 5-10: 系统集成开发（渠道 + 派工 + 消息队列）
- Week 11-12: 前端重构与集成

**风险分析**:

**高风险项**:
1. 飞书认证 + 组织同步（Week 3-4）
   - 依赖外部系统（飞书API）
   - 需要申请API权限
   - 可能遇到网络、接口变更等问题

2. 渠道系统集成（Week 7-8）
   - 依赖外部系统（渠道管理系统）
   - 需要定义API规范（对方可能不接受）
   - 测试和调试复杂

3. 派工系统集成（Week 9-10）
   - 同上，依赖外部系统

**建议**: 考虑延后外部系统集成到第二阶段，优先内部核心功能

### 7. 测试策略不够具体（低）

**缺失内容**:

1. **性能测试具体方案未定义**
   - 当前："支持100+并发用户日常操作"
   - 缺少：压力测试工具（JMeter？Locust？）
   - 缺少：响应时间要求（API响应<500ms？）
   - 缺少：数据库查询优化目标（N+1查询？）

2. **集成测试场景不完整**
   - 当前仅3个场景
   - 缺少：数据冲突处理测试
   - 缺少：消息队列失败重试测试
   - 缺少：幂等性验证测试

3. **用户验收测试（UAT）未规划**
   - 缺少：真实业务场景测试
   - 缺少：各角色实际使用测试
   - 缺少：性能回归测试

### 8. 拼写错误（低）

**发现3处拼写错误**:

1. Line 622: `allowed_departments` → 应为 `allowed_departments`
2. Line 459: `participated_activities` → 应为 `participated_activities`
3. Line 85: `renewal` → 应为 `renewal`（多处出现）

---

## recommendations

### 1. 立即补充Customer模型LTV输入字段（优先级：严重）

**必须在开发前完成**:

```python
class Customer(models.Model):
    # ... 现有字段 ...

    # 新增LTV输入字段（Lines 848-867提到的所有字段）
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

    # 保留现有索引和约束
    class Meta:
        indexes = [
            Index(fields=['account', 'is_deleted']),
            Index(fields=['account', 'name']),
            Index(fields=['type', 'status']),
            Index(fields=['industry']),
            Index(fields=['tier']),
            Index(fields=['owner', 'status']),
            Index(fields=['next_action_date']),
            Index(fields=['health_score']),
        ]
        constraints = [
            UniqueConstraint(fields=['account', 'name'], name='unique_customer_name_per_account'),
        ]
```

### 2. 修正拼写错误（优先级：高）

```python
# 修正1: CustomerPool (Line 622)
allowed_departments = JSONField(default=list)  # 正确拼写

# 修正2: Activity (Line 459)
participants = ManyToManyField(User, related_name='participated_activities')  # 正确拼写

# 修正3: LTVHistory.change_reason (Line 85, 585, 589等多处)
('renewal', '续约'),  # 正确拼写
```

### 3. 补充权限矩阵关键定义（优先级：高）

**3.1 导出权限定义**:
```python
EXPORT_PERMISSIONS = {
    'admin': 'all',
    'sales_manager': 'team_data',
    'sales': 'owned_data',
    'presales': 'related_opportunities',
    'aftersales': 'related_customers',
    'viewer': 'owned_data',
}

# 敏感字段过滤（导出时自动过滤）
SENSITIVE_EXPORT_FIELDS = [
    'channel_commission',  # 渠道佣金（如ChannelPartner模型有此字段）
    'internal_notes',      # 内部备注
]
```

**3.2 售前可编辑字段清单**:
```python
PRESALES_EDITABLE_FIELDS = {
    'Opportunity': ['description', 'competitive_advantage', 'notes'],
    'Activity': ['content', 'outcome', 'duration_minutes'],
}

PRESALES_READONLY_FIELDS = {
    'Opportunity': ['amount', 'probability', 'stage', 'expected_close_date'],
}
```

**3.3 团队成员判断逻辑**:
```python
def get_team_members(manager: User) -> QuerySet[User]:
    """获取经理的所有下属（递归）"""
    # 使用递归CTE或多次查询获取所有下级
    team_ids = [manager.id]
    changed = True
    while changed:
        changed = False
        new_members = User.objects.filter(
            manager_id__in=team_ids
        ).exclude(id__in=team_ids)
        if new_members.exists():
            new_ids = list(new_members.values_list('id', flat=True))
            team_ids.extend(new_ids)
            changed = True
    return User.objects.filter(id__in=team_ids)

def can_view_user_data(user: User, target_user: User) -> bool:
    """判断user是否可以查看target_user的数据"""
    if user.role == 'admin':
        return True
    if user.role == 'sales_manager':
        # 销售经理可以查看团队成员数据
        return target_user in get_team_members(user)
    # 其他角色只能查看自己的数据
    return user.id == target_user.id
```

### 4. 明确公海池保护期自动延长规则（优先级：中）

**推荐规则**:
```python
# 1. 定义有效跟进活动类型
VALID_FOLLOWUP_ACTIVITIES = [
    'call',      # 电话沟通
    'visit',     # 拜访
    'demo',      # 产品演示
    'meeting',   # 会议
    'proposal',  # 方案提交
]

# 2. 保护期延长逻辑
def extend_protection_period_on_activity(sender, instance, created, **kwargs):
    """监听Activity创建，判断是否延长保护期"""
    from .models import Customer, PoolCustomer

    if not isinstance(instance, Activity):
        return

    customer = instance.customer
    if not customer:
        return

    # 检查客户是否在保护期中
    pool_customer = PoolCustomer.objects.filter(
        customer=customer,
        status='protected'
    ).first()

    if not pool_customer or not pool_customer.protection_until:
        return

    # 如果活动类型为有效跟进，延长保护期15天
    if instance.type in VALID_FOLLOWUP_ACTIVITIES:
        # 延长至当前保护期结束时间 + 15天
        new_protection_end = pool_customer.protection_until + timedelta(days=15)

        # 但限制最多90天
        max_protection_end = timezone.now() + timedelta(days=90)
        if new_protection_end > max_protection_end:
            new_protection_end = max_protection_end

        pool_customer.protection_until = new_protection_end
        pool_customer.save()

        # 记录保护期延长活动
        Activity.objects.create(
            customer=customer,
            type='protection_extend',
            subject='保护期自动延长',
            content=f'因{instance.get_type_display()}活动，保护期延长至{new_protection_end.date()}',
            activity_date=timezone.now(),
            owner=customer.owner or instance.owner
        )

# 3. 注册Django Signal
from django.db.models.signals import post_save
post_save.connect(extend_protection_period_on_activity, sender=Activity)
```

### 5. 明确LTV触发时机条件（优先级：低）

**修正Line 879**:
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

### 6. 补充前端实现考虑（优先级：中）

**6.1 Redux Store结构建议**:
```typescript
// store/index.ts
interface CRMState {
  user: User | null;
  customers: Customer[];
  opportunities: Opportunity[];
  activities: Activity[];
  poolCustomers: PoolCustomer[];
  loading: boolean;
  error: string | null;
}

// store/customerSlice.ts
interface CustomerState {
  customers: Customer[];
  filters: CustomerFilters;
  selectedCustomer: Customer | null;
}

interface CustomerFilters {
  status?: string;
  tier?: string;
  industry?: string;
  ltvTier?: string;
  owner?: string;
}
```

**6.2 WebSocket集成建议**:
```typescript
// hooks/useWebSocket.ts
export const useCRMWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // 订阅当前用户的频道
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: [
          `user_${user.id}`,
          `team_${user.feishu_team_id || ''}`,
          `ltv_updates`,
          `pool_changes`,
        ]
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message, setNotifications);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 5s...');
      setTimeout(() => ws.reconnect(), 5000);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  return { socket, notifications };
};

function handleWebSocketMessage(message: WSMessage, setNotifications) {
  switch (message.type) {
    case 'opportunity_stage_changed':
      // 刷新商机列表
      store.dispatch(opportunityActions.fetchOpportunities());
      showNotification('商机阶段已更新');
      break;

    case 'ltv_updated':
      // 刷新LTV数据
      store.dispatch(customerActions.fetchCustomerLTV(message.customer_id));
      break;

    case 'pool_customer_released':
      // 公海池客户释放
      store.dispatch(poolActions.fetchAvailableCustomers());
      showNotification('新客户已释放到公海池');
      break;
  }
}
```

**6.3 表单验证规则**:
```typescript
// utils/validation.ts
export const customerFormValidation = {
  name: [
    { required: true, message: '客户名称必填' },
    { max: 200, message: '客户名称不能超过200字符' },
    pattern: /^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/,
  ],
  unified_social_credit_code: [
    { pattern: /^[1-9][0-9X]{16}$/, message: '统一社会信用代码格式不正确' },
  ],
  mobile: [
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
  ],
};

export const opportunityFormValidation = {
  name: [
    { required: true, message: '商机名称必填' },
    { max: 200, message: '商机名称不能超过200字符' },
  ],
  amount: [
    { required: true, message: '商机金额必填' },
    { min: 0, message: '商机金额不能为负数' },
  ],
  expected_close_date: [
    { required: true, message: '预计成交日期必填' },
    { type: 'date', message: '日期格式不正确' },
  ],
};
```

### 7. 调整实施计划优先级（优先级：中）

**建议分两阶段实施**:

**阶段1: 内部核心功能（Week 1-8）**
- Week 1-2: 后端基础架构 + 数据库模型（补充LTV字段）
- Week 3-4: 核心CRUD API + 飞书认证
- Week 5-6: LTV计算逻辑 + 公海池回收/领取功能
- Week 7-8: 前端基础架构 + 客户/商机/联系人页面

**阶段2: 外部集成与增强（Week 9-12）**
- Week 9-10: 渠道系统集成
- Week 11-12: 派工系统集成
- 订单系统集成预留到下一阶段

**优势**:
1. 降低风险：不依赖外部系统即可交付核心功能
2. 验证价值：先验证LTV和公海池业务逻辑
3. 迭代灵活：根据使用反馈调整外部集成方案

### 8. 补充测试策略（优先级：低）

**8.1 性能测试方案**:
```python
# Locust性能测试脚本
from locust import HttpUser, task, between

class CRMUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def view_customer_list(self):
        self.client.get("/api/v1/customers/")

    @task(1)
    def create_customer(self):
        self.client.post("/api/v1/customers/", json={
            "name": "测试客户",
            "type": "enterprise",
            "tier": "strategic",
        })

    @task(1)
    def view_opportunity_list(self):
        self.client.get("/api/v1/opportunities/")

# 性能目标
# 并发用户: 100
# 目标响应时间: P95 < 500ms
# 目标吞吐量: 100 req/s
```

**8.2 集成测试增强**:
```python
# 测试场景扩展
class IntegrationTests(TestCase):
    def test_channel_sync_conflict(self):
        """测试渠道同步冲突处理"""
        # 模拟CRM和渠道系统同时更新同一客户
        pass

    def test_message_queue_retry(self):
        """测试消息队列失败重试机制"""
        # 模拟外部系统不可用
        pass

    def test_idempotency(self):
        """测试API幂等性"""
        # 重复发送相同请求
        pass

    def test_data_consistency(self):
        """测试数据一致性"""
        # 对比CRM和外部系统数据
        pass
```

**8.3 UAT测试计划**:
```markdown
## UAT测试场景

### 场景1: 销售人员日常操作
- [ ] 创建新客户
- [ ] 创建商机并设置阶段
- [ ] 添加跟进记录
- [ ] 查看LTV评分
- [ ] 从公海池领取客户

### 场景2: 销售经理团队管理
- [ ] 查看团队成员业绩
- [ ] 查看团队商机管道
- [ ] 审批团队成员的商机金额变更
- [ ] 查看团队LTV总额

### 场景3: 售前技术支持
- [ ] 查看关联商机（只读权限）
- [ ] 添加技术需求（编辑权限）
- [ ] 添加跟进记录
- [ ] 尝试修改商机金额（应失败）

### 场景4: 公海池自动回收
- [ ] 创建30天未跟进的客户
- [ ] 等待每日自动回收任务执行
- [ ] 验证客户进入公海池
- [ ] 验证原负责人被清除

### 场景5: LTV自动计算
- [ ] 更新客户营收数据
- [ ] 验证LTV评分自动重算
- [ ] 验证LTV分层正确
```

---

## 总结

### 设计质量评分

| 维度 | 评分 | 说明 |
|-----|------|------|
| 业务逻辑完整性 | 85/100 | 核心逻辑完整，但Customer缺少LTV字段 |
| 公海池规则可执行性 | 90/100 | 规则具体可执行，保护期延长需补充 |
| 权限设计实现难度 | 75/100 | 框架清晰，但缺少字段级权限定义和团队判断逻辑 |
| 前端实现考虑 | 70/100 | 路由合理，但状态管理、WebSocket、表单验证未定义 |
| 实施计划可行性 | 80/100 | 计划合理但时间紧张，建议分阶段 |
| 测试策略完整性 | 75/100 | 覆盖主要场景，但性能测试和UAT需补充 |
| **总体评分** | **79/100** | **良好** |

### 已完成的优化 ✅

1. User模型添加manager和feishu_team_id字段
2. Customer模型添加current_pool和pool_entered_at字段
3. Customer模型添加5个索引和1个UniqueConstraint
4. Lead模型添加tracking_id字段
5. Opportunity模型添加source_tracking_id和converted_from_lead字段
6. Opportunity模型添加4个索引
7. Activity模型添加3个索引
8. LTV阈值从80%改为40%
9. LTV逻辑明确为纯评分制（0-100分）
10. PoolCustomer模型添加owner、protection_until、last_released_at、last_claimed_at字段

### 待完善的关键问题 ⚠️

**必须修复（阻塞开发）**:
1. **严重**: Customer模型缺少11个LTV输入字段
2. **高**: 补充导出权限定义
3. **高**: 明确售前"部分字段"列表
4. **高**: 补充团队成员判断逻辑

**建议修复（提升质量）**:
5. **中**: 明确保护期自动延长规则
6. **低**: 修正3处拼写错误
7. **低**: 修正LTV触发时机单位混淆
8. **低**: 补充前端状态管理、WebSocket、表单验证
9. **低**: 调整实施计划分两阶段
10. **低**: 补充性能测试方案和UAT计划

### 实施建议优先级

**P0 - 立即修复（阻塞开发）**:
- [ ] 补充Customer模型LTV输入字段
- [ ] 修正3处拼写错误

**P1 - 开发前明确（高优先级）**:
- [ ] 定义导出权限规则
- [ ] 列出售前可编辑字段清单
- [ ] 定义团队成员判断逻辑
- [ ] 明确保护期自动延长规则
- [ ] 修正LTV触发时机

**P2 - 开发中设计（中优先级）**:
- [ ] 设计Redux Store结构
- [ ] 定义WebSocket消息格式
- [ ] 设计表单验证规则
- [ ] 设计公海池前端流程
- [ ] 设计LTV展示组件细节

**P3 - 优化阶段（低优先级）**:
- [ ] 调整实施计划分两阶段
- [ ] 编写Locust性能测试脚本
- [ ] 编写UAT测试计划
- [ ] 明确性能测试目标和工具

---

## 结语

CRM设计方案整体架构合理，业务逻辑清晰，数据模型设计完善。主要优势在于：
1. 多租户支持良好的数据隔离
2. 公海池设计可执行，规则具体
3. LTV评分制逻辑清晰且已修正
4. 索引设计覆盖主要查询场景
5. 团队层级支持完善

但存在以下必须解决的问题：
1. **Customer模型缺少LTV输入字段**（严重阻塞）
2. 权限矩阵缺少关键字段级定义
3. 公海池保护期延长规则不明确
4. 实施计划时间紧张，建议分阶段

**建议**: 在正式开发前，优先解决P0和P1级问题，确保设计文档完整性和可执行性。
