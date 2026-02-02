# CRM系统 - 全新系统设计方案

## 项目背景

基于现有纯前端系统,进行全新的系统架构设计,打造一个综合型CRM系统。

## 需求分析

### 业务场景
- **综合CRM**: 涵盖B2B销售、线索管理、客户关系维护
- **长周期销售**: 企业级产品销售,需要多轮跟进和多角色决策
- **团队协作**: 支持销售团队、管理层、其他部门协同工作

### 核心痛点
1. **客户信息管理**: 信息分散,难以统一管理和查询
2. **跟进过程管理**: 跟进记录不完整,难以追溯历史
3. **商机管道管理**: 商机进展不透明,难以预测成交
4. **数据分析报表**: 销售数据难以统计分析,缺乏决策依据

### 用户角色
1. **销售人员**: 一线销售,需要快速录入和查询客户信息
2. **销售经理**: 团队管理,需要监控团队业绩 and 商机进展
3. **高层管理者**: 战略决策,需要宏观数据和趋势分析
4. **其他角色**: 售前、售后、市场等支持部门

### 技术要求
- **后端**: Django + DRF + PostgreSQL
- **前端**: Next.js 14 + Redux Toolkit + Ant Design
- **认证**: 飞书集成,同步组织架构
- **部署**: 本地服务器
- **数据**: 从空数据开始(暂不迁移旧数据)

## 全新数据模型设计

### 核心实体关系

```
┌─────────────┐
│   Account   │  企业账号(多租户支持)
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
┌──────▼──────┐                      ┌───────▼──────┐
│    User     │                      │   Customer   │  客户
│  (飞书同步)  │                      └───────┬──────┘
└──────┬──────┘                              │
       │                                     ├────────────┬────────────┐
       │                                     │            │            │
       │                              ┌──────▼──────┐ ┌──▼────┐ ┌────▼────┐
       │                              │   Contact   │ │ Lead  │ │Activity │
       │                              │   联系人     │ │ 线索  │ │ 活动    │
       │                              └─────────────┘ └───────┘ └─────────┘
       │                                     │
       │                              ┌──────▼──────┐
       └──────────────────────────────►│Opportunity │  商机
                                      │   (owner)   │
                                      └──────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │   Stage     │  阶段历史
                                      │   History   │
                                      └─────────────┘
```

### 1. Account (企业账号)
**用途**: 多租户支持,隔离不同企业数据

```python
class Account(models.Model):
    id = UUIDField(primary_key=True)
    name = CharField(max_length=200)  # 企业名称
    feishu_tenant_key = CharField(unique=True)  # 飞书租户key
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    settings = JSONField(default=dict)  # 企业配置
```

### 2. User (用户)
**用途**: 系统用户,从飞书同步

```python
class User(AbstractUser):
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 飞书字段
    feishu_open_id = CharField(max_length=100, unique=True)
    feishu_union_id = CharField(max_length=100, unique=True, null=True)
    feishu_user_id = CharField(max_length=100, unique=True, null=True)

    # 用户信息
    display_name = CharField(max_length=100)
    avatar_url = URLField(null=True)
    mobile = CharField(max_length=20, null=True)
    email = EmailField()

    # 组织信息
    department_id = CharField(max_length=100, null=True)
    department_name = CharField(max_length=200, null=True)
    job_title = CharField(max_length=100, null=True)
    feishu_team_id = CharField(max_length=100, null=True, blank=True)  # 飞书团队ID

    # 团队层级
    manager = ForeignKey('self', on_delete=SET_NULL, null=True, blank=True, related_name='team_members')  # 上级经理

    # 角色权限
    role = CharField(max_length=20, choices=[
        ('admin', '系统管理员'),
        ('sales_manager', '销售经理'),
        ('sales', '销售人员'),
        ('presales', '售前支持'),
        ('aftersales', '售后支持'),
        ('viewer', '只读用户'),
    ])

    # 状态
    is_active = BooleanField(default=True)
    last_sync_at = DateTimeField(null=True)  # 最后同步时间
```

### 3. Customer (客户)
**用途**: 核心实体,代表企业客户

```python
class Customer(models.Model):
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 基本信息
    name = CharField(max_length=200)  # 客户名称
    short_name = CharField(max_length=100, null=True)  # 简称
    unified_social_credit_code = CharField(max_length=50, null=True)  # 统一社会信用代码

    # 分类
    type = CharField(max_length=20, choices=[
        ('enterprise', '企业客户'),
        ('government', '政府机构'),
        ('institution', '事业单位'),
        ('other', '其他'),
    ])
    tier = CharField(max_length=20, choices=[
        ('strategic', '战略客户'),  # 原"龙头"
        ('key', '重点客户'),        # 原"腰部"
        ('standard', '标准客户'),    # 原"小微"
        ('potential', '潜在客户'),
    ])
    industry = CharField(max_length=100, null=True)  # 行业

    # 地理信息
    province = CharField(max_length=50, null=True)
    city = CharField(max_length=50, null=True)
    district = CharField(max_length=50, null=True)
    address = TextField(null=True)

    # 规模信息
    employee_count = IntegerField(null=True)  # 员工数
    annual_revenue = DecimalField(max_digits=15, decimal_places=2, null=True)  # 年营收

    # 业务信息
    source = CharField(max_length=50, choices=[
        ('referral', '客户转介绍'),
        ('partner', '合作伙伴'),
        ('exhibition', '展会'),
        ('website', '官网'),
        ('cold_call', '陌生拜访'),
        ('other', '其他'),
    ], null=True)

    # 负责人
    owner = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='owned_customers')
    team_members = ManyToManyField(User, related_name='team_customers', blank=True)

    # 公海池
    current_pool = ForeignKey('CustomerPool', on_delete=SET_NULL, null=True, blank=True)  # 当前所在公海池
    pool_entered_at = DateTimeField(null=True, blank=True)  # 进入公海池时间

    # 状态
    status = CharField(max_length=20, choices=[
        ('lead', '线索'),
        ('qualified', '已确认'),
        ('negotiating', '谈判中'),
        ('customer', '成交客户'),
        ('inactive', '休眠'),
        ('lost', '已流失'),
    ])

    # 评分系统
    health_score = IntegerField(default=0)  # 健康度评分 0-100
    potential_score = IntegerField(default=0)  # 潜力评分 0-100
    engagement_score = IntegerField(default=0)  # 活跃度评分 0-100

    # LTV缓存字段（冗余，用于快速查询）
    ltv_score = IntegerField(default=0)  # LTV评分 0-100（从CustomerLTV同步）
    ltv_tier = CharField(max_length=20, choices=[
        ('platinum', '白金客户'),  # 80-100分
        ('gold', '黄金客户'),      # 60-79分
        ('silver', '白银客户'),    # 40-59分
        ('bronze', '青铜客户'),    # 0-39分
    ], default='bronze')
    ltv_calculated_at = DateTimeField(null=True)  # LTV最后计算时间

    # 重要日期
    first_contact_date = DateField(null=True)  # 首次接触日期
    last_contact_date = DateField(null=True)  # 最后接触日期
    next_action_date = DateField(null=True)  # 下次行动日期

    # 标签
    tags = JSONField(default=list)  # ['重点关注', '技术型', '价格敏感']

    # 备注
    description = TextField(null=True)
    internal_notes = TextField(null=True)  # 内部备注(客户不可见)

    # 软删除
    is_deleted = BooleanField(default=False)
    deleted_at = DateTimeField(null=True)
    deleted_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='deleted_customers')

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='created_customers')
    updated_at = DateTimeField(auto_now=True)
    updated_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='updated_customers')

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

### 4. Contact (联系人)
**用途**: 客户企业内的联系人

```python
class Contact(models.Model):
    id = UUIDField(primary_key=True)
    customer = ForeignKey(Customer, on_delete=CASCADE, related_name='contacts')

    # 基本信息
    name = CharField(max_length=100)
    gender = CharField(max_length=10, choices=[('male', '男'), ('female', '女'), ('other', '其他')], null=True)
    job_title = CharField(max_length=100, null=True)
    department = CharField(max_length=100, null=True)

    # 联系方式
    mobile = CharField(max_length=20, null=True)
    phone = CharField(max_length=20, null=True)
    email = EmailField(null=True)
    wechat = CharField(max_length=100, null=True)

    # 角色
    role_type = CharField(max_length=20, choices=[
        ('decision_maker', '决策人'),
        ('influencer', '影响者'),
        ('user', '使用者'),
        ('gatekeeper', '把关者'),
    ])
    is_primary = BooleanField(default=False)  # 是否主要联系人

    # 偏好
    preferred_contact_method = CharField(max_length=20, choices=[
        ('phone', '电话'),
        ('email', '邮件'),
        ('wechat', '微信'),
        ('visit', '拜访'),
    ], null=True)

    # 关系
    relationship_level = CharField(max_length=20, choices=[
        ('excellent', '优秀'),
        ('good', '良好'),
        ('normal', '一般'),
        ('poor', '较差'),
    ], default='normal')

    # 备注
    notes = TextField(null=True)

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### 5. Lead (线索)
**用途**: 潜在客户线索,转化后成为Customer

```python
class Lead(models.Model):
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 基本信息
    company_name = CharField(max_length=200)
    contact_name = CharField(max_length=100, null=True)
    contact_mobile = CharField(max_length=20, null=True)
    contact_email = EmailField(null=True)

    # 来源
    source = CharField(max_length=50)
    source_detail = CharField(max_length=200, null=True)  # 来源详情

    # 状态
    status = CharField(max_length=20, choices=[
        ('new', '新线索'),
        ('contacted', '已联系'),
        ('qualified', '已确认'),
        ('converted', '已转化'),
        ('invalid', '无效'),
    ])

    # 负责人
    owner = ForeignKey(User, on_delete=SET_NULL, null=True)

    # 转化
    converted_to_customer = ForeignKey(Customer, on_delete=SET_NULL, null=True)
    converted_at = DateTimeField(null=True)

    # 链路追踪
    tracking_id = UUIDField(default=uuid.uuid4, db_index=True)  # 追踪从线索到商机的完整转化路径

    # 备注
    notes = TextField(null=True)

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### 6. Opportunity (商机)
**用途**: 销售商机,跟踪销售进展

```python
class Opportunity(models.Model):
    id = UUIDField(primary_key=True)
    customer = ForeignKey(Customer, on_delete=CASCADE, related_name='opportunities')

    # 基本信息
    name = CharField(max_length=200)  # 商机名称
    description = TextField(null=True)

    # 产品线
    product_line = CharField(max_length=100, choices=[
        ('ip_guard', 'IP-Guard'),
        ('anybackup', 'AnyBackup'),
        ('anyshare', 'AnyShare'),
        ('bundle', '组合方案'),
        ('other', '其他'),
    ])

    # 阶段
    stage = CharField(max_length=20, choices=[
        ('prospecting', '初步接触'),
        ('qualification', '需求确认'),
        ('proposal', '方案设计'),
        ('negotiation', '商务谈判'),
        ('closed_won', '赢单'),
        ('closed_lost', '输单'),
        ('on_hold', '搁置'),
    ])

    # 金额
    amount = DecimalField(max_digits=15, decimal_places=2, null=True)  # 预计金额
    actual_amount = DecimalField(max_digits=15, decimal_places=2, null=True)  # 实际成交金额
    probability = IntegerField(default=0)  # 成交概率 0-100

    # 时间
    expected_close_date = DateField(null=True)  # 预计成交日期
    actual_close_date = DateField(null=True)  # 实际成交日期

    # 负责人
    owner = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='owned_opportunities')
    team_members = ManyToManyField(User, related_name='team_opportunities', blank=True)

    # 线索追踪
    source_tracking_id = UUIDField(null=True, db_index=True)  # 来源线索的tracking_id
    converted_from_lead = ForeignKey('Lead', on_delete=SET_NULL, null=True, blank=True, related_name='converted_opportunities')  # 转化自哪个线索

    # 竞争信息
    competitors = JSONField(default=list)  # ['竞争对手A', '竞争对手B']
    competitive_advantage = TextField(null=True)  # 竞争优势

    # 输单原因(如果输单)
    loss_reason = CharField(max_length=100, choices=[
        ('price', '价格'),
        ('competitor', '竞争对手'),
        ('timing', '时机不对'),
        ('no_budget', '无预算'),
        ('no_decision', '未决策'),
        ('other', '其他'),
    ], null=True)
    loss_detail = TextField(null=True)

    # 备注
    notes = TextField(null=True)

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='created_opportunities')
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            Index(fields=['customer', 'stage']),
            Index(fields=['owner', 'stage']),
            Index(fields=['stage', 'probability']),
            Index(fields=['amount']),
            Index(fields=['product_line']),
            Index(fields=['expected_close_date']),
        ]
```

### 7. Activity (活动/跟进记录)
**用途**: 记录所有与客户的互动

```python
class Activity(models.Model):
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 关联对象
    customer = ForeignKey(Customer, on_delete=CASCADE, related_name='activities')
    opportunity = ForeignKey(Opportunity, on_delete=SET_NULL, null=True, related_name='activities')
    contact = ForeignKey(Contact, on_delete=SET_NULL, null=True, related_name='activities')

    # 活动类型
    type = CharField(max_length=20, choices=[
        ('call', '电话沟通'),
        ('email', '邮件'),
        ('meeting', '会议'),
        ('visit', '拜访'),
        ('demo', '产品演示'),
        ('proposal', '方案提交'),
        ('contract', '合同签订'),
        ('other', '其他'),
    ])

    # 活动方向
    direction = CharField(max_length=20, choices=[
        ('outbound', '主动外呼'),
        ('inbound', '客户来电'),
    ], null=True)

    # 活动内容
    subject = CharField(max_length=200)  # 主题
    content = TextField()  # 详细内容
    outcome = TextField(null=True)  # 结果

    # 时间
    activity_date = DateTimeField()  # 活动时间
    duration_minutes = IntegerField(null=True)  # 持续时间(分钟)

    # 下次行动
    next_action = CharField(max_length=200, null=True)
    next_action_date = DateField(null=True)

    # 参与人
    owner = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='owned_activities')
    participants = ManyToManyField(User, related_name='participated_activities', blank=True)

    # 附件
    attachments = JSONField(default=list)  # [{'name': 'file.pdf', 'url': '...'}]

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='created_activities')

    class Meta:
        indexes = [
            Index(fields=['customer', 'activity_date']),
            Index(fields=['owner', 'activity_date']),
            Index(fields=['type']),
            Index(fields=['direction']),
            Index(fields=['activity_date']),
            Index(fields=['next_action_date']),
        ]
        ordering = ['-activity_date']
```

### 8. StageHistory (阶段历史)
**用途**: 记录商机阶段变更历史

```python
class StageHistory(models.Model):
    id = UUIDField(primary_key=True)
    opportunity = ForeignKey(Opportunity, on_delete=CASCADE, related_name='stage_history')

    from_stage = CharField(max_length=20)
    to_stage = CharField(max_length=20)

    duration_days = IntegerField(null=True)  # 在前一阶段停留天数

    changed_by = ForeignKey(User, on_delete=SET_NULL, null=True)
    changed_at = DateTimeField(auto_now_add=True)

    notes = TextField(null=True)

    class Meta:
        ordering = ['-changed_at']
```

### 9. CustomerLTVProfile (LTV计算输入数据)
**用途**: LTV计算输入数据（特征层）

```python
class CustomerLTVProfile(models.Model):
    """LTV输入特征"""
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    customer = OneToOneField(Customer, on_delete=CASCADE, related_name='ltv_profile')

    # 企业规模数据
    market_cap_billion = DecimalField(max_digits=15, decimal_places=2, null=True)  # 市值（亿元）
    it_investment_wan = DecimalField(max_digits=15, decimal_places=2, null=True)  # IT投资（万元）

    # 营收数据
    revenue_2022_wan = DecimalField(max_digits=15, decimal_places=2, null=True)  # 2022年营收（万元）
    revenue_2023_wan = DecimalField(max_digits=15, decimal_places=2, null=True)  # 2023年营收（万元）
    revenue_2024_wan = DecimalField(max_digits=15, decimal_places=2, null=True)  # 2024年营收（万元）

    # 行业地位
    industry_position = CharField(max_length=50, null=True, choices=[
        ('top_500', 'Top 500'),
        ('top_1000', 'Top 1000'),
        ('leading', '领先企业'),
        ('regional', '区域龙头'),
        ('other', '其他'),
    ])

    # 历史业绩
    known_history_performance = IntegerField(default=0)  # 已知历史业绩评分 0-100
    past_three_years_performance = IntegerField(default=0)  # 过去3年表现评分 0-100
    future_three_years_opportunity = IntegerField(default=0)  # 未来3年机会评分 0-100

    # 商机类型
    has_ip_guard_opportunity = BooleanField(default=False)  # 是否有IP-Guard商机
    has_anyshare_opportunity = BooleanField(default=False)  # 是否有AnyShare商机

    # 合作关系
    is_strategic_partner = BooleanField(default=False)  # 是否战略合作伙伴
    can_access_decision_makers = BooleanField(default=False)  # 是否可接触决策人

    # 版本控制
    profile_version = CharField(max_length=20, default='v1.0')  # LTV算法版本

    # 数据来源
    data_source = CharField(max_length=50, default='manual')  # manual/sync/import

    # 更新追踪
    last_updated_by = ForeignKey(User, on_delete=SET_NULL, null=True)

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            Index(fields=['profile_version']),
            Index(fields=['-updated_at']),
        ]
```

### 10. CustomerLTV (客户生命周期价值模型)
**用途**: 量化客户价值,指导销售策略

```python
class CustomerLTV(models.Model):
    id = UUIDField(primary_key=True)
    customer = OneToOneField(Customer, on_delete=CASCADE, related_name='ltv')

    # LTV核心指标（评分系统）
    ltv_score = IntegerField(default=0)  # LTV评分 0-100
    ltv_tier = CharField(max_length=20, choices=[
        ('platinum', '白金客户'),  # 80-100分
        ('gold', '黄金客户'),      # 60-79分
        ('silver', '白银客户'),    # 40-59分
        ('bronze', '青铜客户'),    # 0-39分
    ])

    # 评分组成部分（保留现有前端逻辑）
    explicit_value_score = IntegerField(default=0)  # 显性价值评分 0-40
    implicit_value_score = IntegerField(default=0)  # 隐性价值评分 0-40
    growth_value_score = IntegerField(default=0)    # 增长价值评分 0-20

    # 实际营收追踪（独立于评分）
    historical_revenue = DecimalField(max_digits=15, decimal_places=2, default=0)  # 历史成交金额
    current_pipeline_value = DecimalField(max_digits=15, decimal_places=2, default=0)  # 当前管道价值
    predicted_revenue = DecimalField(max_digits=15, decimal_places=2, default=0)  # 预测营收

    # 计算因子（用于预测营收）
    purchase_frequency = DecimalField(max_digits=5, decimal_places=2, default=0)  # 购买频率(次/年)
    average_order_value = DecimalField(max_digits=15, decimal_places=2, default=0)  # 平均订单金额
    customer_lifespan_months = IntegerField(default=0)  # 客户生命周期(月)
    churn_probability = DecimalField(max_digits=5, decimal_places=4, default=0)  # 流失概率 0-1

    # 健康度指标
    engagement_level = CharField(max_length=20, choices=[
        ('very_active', '非常活跃'),
        ('active', '活跃'),
        ('moderate', '一般'),
        ('at_risk', '有流失风险'),
        ('churned', '已流失'),
    ])
    last_purchase_days_ago = IntegerField(null=True)  # 距上次购买天数
    nps_score = IntegerField(null=True)  # 净推荐值 -100 to 100

    # 数据完整性
    data_completeness = CharField(max_length=20, choices=[
        ('sufficient', '数据充足'),
        ('insufficient', '数据不足'),
    ], default='insufficient')

    # 计算元数据
    calculation_method = CharField(max_length=50, default='weighted_scoring')  # 计算方法
    last_calculated_at = DateTimeField(auto_now=True)
    calculated_by = CharField(max_length=50, default='system')  # system/manual

    # 备注
    notes = TextField(null=True)

    class Meta:
        indexes = [
            Index(fields=['-ltv_score']),
            Index(fields=['ltv_tier']),
            Index(fields=['engagement_level']),
            Index(fields=['-historical_revenue']),
        ]
```

### 10. LTVHistory (LTV历史记录)
**用途**: 追踪LTV变化趋势

```python
class LTVHistory(models.Model):
    id = UUIDField(primary_key=True)
    customer_ltv = ForeignKey(CustomerLTV, on_delete=CASCADE, related_name='history')

    # 快照数据
    ltv_score = DecimalField(max_digits=15, decimal_places=2)
    ltv_tier = CharField(max_length=20)
    engagement_level = CharField(max_length=20)

    # 变化原因
    change_reason = CharField(max_length=100, choices=[
        ('new_purchase', '新购买'),
        ('renewal', '续约'),
        ('upsell', '追加销售'),
        ('churn', '流失'),
        ('engagement_change', '活跃度变化'),
        ('manual_adjustment', '手动调整'),
        ('scheduled_recalc', '定期重算'),
    ])
    change_detail = TextField(null=True)

    # 时间戳
    recorded_at = DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            Index(fields=['customer_ltv', '-recorded_at']),
        ]
```

### 11. CustomerPool (公海池)
**用途**: 存放无人负责或被回收客户的"池子"

```python
class CustomerPool(models.Model):
    """公海池"""
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 基本信息
    name = CharField(max_length=100)  # 池名称，如"通用公海池"、"大客户公海池"
    description = TextField(null=True)

    # 规则配置
    rules = JSONField(default=dict)  # 存储回收规则配置

    # 权限配置
    allowed_roles = JSONField(default=list)  # 允许领取的角色
    allowed_departments = JSONField(default=list)  # 允许领取的部门

    # 状态
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)


class PoolCustomer(models.Model):
    """公海池中的客户"""
    id = UUIDField(primary_key=True)
    pool = ForeignKey(CustomerPool, on_delete=CASCADE)
    customer = ForeignKey(Customer, on_delete=CASCADE)

    # 归属者（用于"本团队"权限判断）
    owner = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='pool_owned_customers')

    # 回收信息
    recycled_at = DateTimeField(auto_now_add=True)
    recycled_reason = CharField(max_length=50, choices=[
        ('timeout', '超时未跟进'),
        ('no_progress', '长期无进展'),
        ('manual', '手动释放'),
        ('leave', '员工离职'),
    ])
    previous_owner = ForeignKey(User, on_delete=SET_NULL, null=True)

    # 领取信息
    claimed_at = DateTimeField(null=True)
    claimed_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='claimed_customers')

    # 保护期追踪
    protection_until = DateTimeField(null=True, blank=True)  # 保护期到期时间

    # 冷却期追踪
    last_released_at = DateTimeField(null=True, blank=True)  # 最后释放时间
    last_claimed_at = DateTimeField(null=True, blank=True)  # 最后领取时间

    # 状态
    status = CharField(max_length=20, choices=[
        ('available', '可领取'),
        ('claimed', '已领取'),
        ('protected', '保护期'),
    ])

    class Meta:
        unique_together = ['pool', 'customer']
```

### LTV计算逻辑

#### 三层模型架构

系统采用**三层LTV模型架构**，关注点分离，支持灵活迭代：

**第一层 - Customer (基础信息 + LTV缓存)**:
- 存储客户基础信息（名称、行业、状态等）
- **LTV缓存字段**: `ltv_score`、`ltv_tier`、`ltv_calculated_at`
- 作用: 快速查询LTV结果，避免关联LTVProfile表

**第二层 - CustomerLTVProfile (LTV输入特征)**:
- 存储LTV计算所需的输入字段/特征（营收数据、行业地位、合作关系等）
- 支持多版本算法: `profile_version`字段
- 作用: 算法迭代时独立升级，不影响Customer表

**第三层 - CustomerLTV (LTV结果 + 历史追踪)**:
- 存储LTV计算结果（评分、分层、实际营收追踪）
- 计算因子（预测营收、流失概率等）
- 作用: 历史追踪、趋势分析、A/B测试

**架构优势**:
- 模型不断调整权重和字段时，独立LTVProfile表降低迁移风险
- 支持多版本LTV算法并存（v1.0、v2.0）和A/B测试
- 未来可轻松将LTV计算独立为微服务，提升计算能力
- LTV调整不影响Customer基础功能，降低回归测试成本

#### 混合计算模型（融合现有实现）

系统采用**双轨制LTV计算**，结合现有前端的潜力评分和新增的实际价值追踪：

**总体公式**:
```python
LTV评分 = (显性价值 × 0.4) + (隐性价值 × 0.4) + (增长价值 × 0.2)

**重要说明**: LTV最终结果为纯评分（0-100分），不涉及货币金额计算。
```

#### 1. 潜力评分 (Potential Score, 0-100分)

**保留现有前端实现的加权评分系统**:

```python
潜力评分 = (显性价值 × 0.4) + (隐性价值 × 0.4) + (增长价值 × 0.2)
```

**1.1 显性价值 (Explicit Value, 40%权重)**
- **历史业绩**: `known_history_performance` (基础分)
- **过去3年表现**: `past_three_years_performance` (50%权重)
- **未来3年机会**: `future_three_years_opportunity` (20%权重)
- **大单奖励**: 如果 `has_large_product_purchase = true`, +30分

**1.2 隐性价值 (Implicit Value, 40%权重)**
- **行业地位**:
  - `industry_position = "Top 500"` → 60分
  - 或基于 `market_cap_billion` 计算
- **企业规模**:
  - `employee_count` 评分
  - `it_investment_wan` 评分
- **合作关系**:
  - `is_strategic_partner` → 加分
  - `can_access_decision_makers` → 加分

**1.3 增长价值 (Growth Value, 20%权重)**
- **商机类型**: IP-Guard或AnyShare/AnyBackup商机加分
- **财务增长**: 基于2022-2024年营收CAGR计算

**数据完整性检查**:
```python
def calcLtvDataCompleteness(customer):
    # 计算LTV相关字段的完整度
    # 如果 <40% 字段完整，标记为"数据不足"
    completeness_ratio = count_filled_fields / total_ltv_fields
    return "Insufficient" if completeness_ratio < 0.4 else "Sufficient"
```

#### 2. 实际价值 (Actual Value, 金额)

**新增基于实际交易的价值追踪**:

**2.1 历史贡献值 (Historical Value)**
```python
historical_value = sum(所有已成交商机的actual_amount)
```

**2.2 当前价值 (Current Value)**
```python
current_value = sum(进行中商机的amount × probability)
```

**2.3 预测价值 (Predicted Value)**
基于以下因子:
- 平均订单金额 (`average_order_value`)
- 购买频率 (`purchase_frequency`)
- 客户生命周期 (`customer_lifespan_months`)
- 流失概率 (`churn_probability`)

```python
predicted_value = (
    average_order_value ×
    purchase_frequency ×
    remaining_lifespan_months / 12
) × (1 - churn_probability) × growth_multiplier
```

**2.4 实际价值总计**
```python
actual_value = historical_value + current_value + predicted_value
```

#### 3. LTV综合评分（0-100分）

**重要**: LTV最终结果为**评分**（0-100分），不是货币金额。

**保留现有前端的评分系统**:

```python
# 最终LTV评分 = 加权平均
ltv_score = (显性价值 × 0.4) + (隐性价值 × 0.4) + (增长价值 × 0.2)

# LTV分层（基于评分）
if ltv_score >= 80:
    ltv_tier = 'platinum'  # 白金客户 (80-100分)
elif ltv_score >= 60:
    ltv_tier = 'gold'      # 黄金客户 (60-79分)
elif ltv_score >= 40:
    ltv_tier = 'silver'    # 白银客户 (40-59分)
else:
    ltv_tier = 'bronze'    # 青铜客户 (0-39分)
```

**评分组成详解**:

**显性价值 (0-40分)**:
```python
explicit_value = (
    known_history_performance * 0.3 +
    past_three_years_performance * 0.5 +
    future_three_years_opportunity * 0.2
)
if has_large_product_purchase:
    explicit_value += 30  # 大单奖励
explicit_value = min(explicit_value, 40)  # 上限40分
```

**隐性价值 (0-40分)**:
```python
implicit_value = 0

# 行业地位 (0-15分)
if industry_position == "Top 500":
    implicit_value += 15
elif market_cap_billion > 100:
    implicit_value += 12
elif market_cap_billion > 10:
    implicit_value += 8

# 企业规模 (0-15分)
if employee_count > 10000:
    implicit_value += 8
elif employee_count > 1000:
    implicit_value += 5

if it_investment_wan > 1000:
    implicit_value += 7
elif it_investment_wan > 100:
    implicit_value += 4

# 合作关系 (0-10分)
if is_strategic_partner:
    implicit_value += 5
if can_access_decision_makers:
    implicit_value += 5

implicit_value = min(implicit_value, 40)  # 上限40分
```

**增长价值 (0-20分)**:
```python
growth_value = 0

# 商机类型 (0-10分)
if has_ip_guard_opportunity:
    growth_value += 5
if has_anyshare_opportunity:
    growth_value += 5

# 财务增长 (0-10分)
revenue_cagr = calculate_cagr(revenue_2022, revenue_2024)
if revenue_cagr > 0.3:  # 30%以上增长
    growth_value += 10
elif revenue_cagr > 0.15:  # 15-30%增长
    growth_value += 6
elif revenue_cagr > 0:  # 正增长
    growth_value += 3

growth_value = min(growth_value, 20)  # 上限20分
```

#### 4. 数据模型扩展

**Customer模型需要保留现有字段**:
```python
class Customer(models.Model):
    # ... 基础字段 ...

    # 现有LTV输入字段（保留）
    market_cap_billion = DecimalField(null=True)
    it_investment_wan = DecimalField(null=True)
    employee_count = IntegerField(null=True)
    revenue_2022_wan = DecimalField(null=True)
    revenue_2023_wan = DecimalField(null=True)
    revenue_2024_wan = DecimalField(null=True)
    industry_position = CharField(max_length=50, null=True)
    known_history_performance = IntegerField(default=0)
    past_three_years_performance = IntegerField(default=0)
    future_three_years_opportunity = IntegerField(default=0)
    has_large_product_purchase = BooleanField(default=False)
    is_strategic_partner = BooleanField(default=False)
    can_access_decision_makers = BooleanField(default=False)

    # 新增：关联到LTV模型
    # ltv = OneToOneField(CustomerLTV, ...)
```

#### 计算触发时机

1. **实时触发**:
   - 商机状态变更为"赢单"
   - 新增重要活动记录
   - 客户状态变更

2. **定时批量**:
   - 每日凌晨2点重算所有客户LTV
   - 每周一重算高价值客户(LTV > 50万)

3. **手动触发**:
   - 销售经理手动请求重算
   - 导入历史数据后批量计算

### LTV在系统中的应用

#### 1. 客户列表优先级排序
- 默认按LTV分数降序排列
- **保留现有LtvBadge组件** (`components/LtvBadge.tsx`)
- LTV徽章显示(白金/黄金/白银/青铜)
- 颜色编码: 白金(紫色)、黄金(金色)、白银(银色)、青铜(棕色)
- 集成位置:
  - 客户列表页 (`app/customers/page.tsx`)
  - 客户详情页 (`app/customers/[id]/page.tsx`)
  - CSV导入/导出功能

#### 2. 智能提醒系统
```python
# 高价值客户风险预警
if customer.ltv.ltv_tier in ['platinum', 'gold'] and customer.ltv.engagement_level == 'at_risk':
    create_alert(
        type='high_value_at_risk',
        priority='urgent',
        message=f'{customer.name}(LTV: {customer.ltv.ltv_score})活跃度下降,需立即跟进'
    )

# 长期未联系预警
if customer.ltv.ltv_tier in ['platinum', 'gold'] and customer.last_contact_date < 30天前:
    create_alert(
        type='high_value_neglected',
        priority='high',
        message=f'{customer.name}已30天未联系,建议安排拜访'
    )
```

#### 3. 销售策略推荐
基于LTV分层的差异化策略:

**白金客户 (LTV > 100万)**:
- 专属客户经理
- 季度高层拜访
- 定制化解决方案
- VIP支持通道

**黄金客户 (LTV 50-100万)**:
- 月度定期回访
- 优先技术支持
- 新产品优先试用

**白银客户 (LTV 10-50万)**:
- 季度电话回访
- 标准支持服务
- 交叉销售机会挖掘

**青铜客户 (LTV < 10万)**:
- 自助服务为主
- 邮件营销
- 社区支持

#### 4. 仪表盘展示
- **销售人员**: "我的高价值客户"列表,LTV趋势图
- **销售经理**: 团队LTV总额,LTV分布饼图,LTV增长趋势
- **高层管理**: 公司总LTV,LTV vs 实际营收对比,LTV预测

#### 5. 报表分析
- LTV分层客户数量分布
- LTV变化趋势分析
- 高LTV客户流失分析
- LTV与实际营收相关性分析

### LTV模型优化建议

1. **机器学习增强**: 使用历史数据训练模型,提高预测准确性
2. **行业基准对比**: 引入行业平均LTV数据作为参考
3. **动态权重调整**: 根据业务变化调整各因子权重
4. **A/B测试**: 对不同LTV计算方法进行效果对比
5. **反馈循环**: 收集销售团队对LTV准确性的反馈,持续优化

## 系统集成架构设计

### 集成概述

本CRM系统作为**客户统一生命周期管理系统**的核心，需要与以下系统进行双向数据同步：

1. **渠道管理系统** (Channel Management System)
2. **派工管理系统** (Work Order/Dispatch System)
3. **订单管理系统** (Order Management System, 未来建设)

**集成原则**:
- 以**客户名称**和**统一社会信用代码**作为关键关联字段
- 采用RESTful API + 消息队列的混合集成模式
- 双向数据同步，保证数据一致性
- 事件驱动架构，实时响应业务变化

### 核心数据模型扩展

#### 1. 客户主数据增强

```python
class Customer(models.Model):
    # ... 现有字段 ...

    # 集成关键字段
    unified_social_credit_code = CharField(max_length=50, unique=True, null=True)  # 统一社会信用代码
    external_customer_id = CharField(max_length=100, null=True)  # 外部系统客户ID

    # 集成状态追踪
    sync_status = JSONField(default=dict)  # {'channel': 'synced', 'order': 'pending', 'workorder': 'synced'}
    last_sync_at = DateTimeField(null=True)

    class Meta:
        indexes = [
            Index(fields=['unified_social_credit_code']),
            Index(fields=['external_customer_id']),
        ]
```

#### 2. 渠道关联模型

```python
class ChannelPartner(models.Model):
    """渠道合作伙伴（分销代理商）"""
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 基本信息
    name = CharField(max_length=200)
    partner_code = CharField(max_length=50, unique=True)  # 渠道商编码
    partner_type = CharField(max_length=20, choices=[
        ('distributor', '分销商'),
        ('agent', '代理商'),
        ('reseller', '经销商'),
    ])

    # 联系信息
    contact_person = CharField(max_length=100)
    contact_phone = CharField(max_length=20)
    contact_email = EmailField()

    # 业务信息
    performance_target = DecimalField(max_digits=15, decimal_places=2, default=0)  # 业绩目标
    actual_performance = DecimalField(max_digits=15, decimal_places=2, default=0)  # 实际业绩
    commission_rate = DecimalField(max_digits=5, decimal_places=4, default=0)  # 佣金比例

    # 外部系统同步
    channel_system_id = CharField(max_length=100, unique=True, null=True)  # 渠道系统ID
    last_sync_from_channel = DateTimeField(null=True)

    # 状态
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

class CustomerChannelRelation(models.Model):
    """客户-渠道关联关系"""
    id = UUIDField(primary_key=True)
    customer = ForeignKey(Customer, on_delete=CASCADE, related_name='channel_relations')
    channel_partner = ForeignKey(ChannelPartner, on_delete=CASCADE, related_name='customers')

    # 关系类型
    relation_type = CharField(max_length=20, choices=[
        ('introduced', '渠道引荐'),
        ('managed', '渠道管理'),
        ('supported', '渠道支持'),
    ])

    # 业绩分配
    revenue_share_percentage = DecimalField(max_digits=5, decimal_places=2, default=0)  # 业绩分成比例

    # 时间
    established_at = DateField()  # 建立关系日期
    created_at = DateTimeField(auto_now_add=True)
```

#### 3. 派工关联模型

```python
class WorkOrder(models.Model):
    """派工单"""
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 关联客户和商机
    customer = ForeignKey(Customer, on_delete=CASCADE, related_name='work_orders')
    opportunity = ForeignKey(Opportunity, on_delete=SET_NULL, null=True, related_name='work_orders')

    # 派工信息
    work_order_no = CharField(max_length=50, unique=True)  # 派工单号
    work_type = CharField(max_length=20, choices=[
        ('presales', '售前支持'),
        ('implementation', '项目实施'),
        ('training', '客户培训'),
        ('maintenance', '维护服务'),
        ('troubleshooting', '故障排查'),
        ('upgrade', '系统升级'),
    ])

    # 任务描述
    title = CharField(max_length=200)
    description = TextField()
    priority = CharField(max_length=20, choices=[
        ('urgent', '紧急'),
        ('high', '高'),
        ('medium', '中'),
        ('low', '低'),
    ])

    # 派工人员
    assigned_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='assigned_work_orders')  # 派工人（销售）
    assigned_to = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='received_work_orders')  # 接单人（技术）
    team_members = ManyToManyField(User, related_name='team_work_orders', blank=True)  # 协作团队

    # 时间管理
    scheduled_start_date = DateTimeField(null=True)
    scheduled_end_date = DateTimeField(null=True)
    actual_start_date = DateTimeField(null=True)
    actual_end_date = DateTimeField(null=True)

    # 状态
    status = CharField(max_length=20, choices=[
        ('pending', '待接单'),
        ('accepted', '已接单'),
        ('in_progress', '进行中'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ])

    # 外部系统同步
    workorder_system_id = CharField(max_length=100, unique=True, null=True)  # 派工系统ID
    last_sync_from_workorder = DateTimeField(null=True)

    # 结果反馈
    completion_notes = TextField(null=True)
    customer_satisfaction = IntegerField(null=True)  # 客户满意度 1-5

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            Index(fields=['customer', 'status']),
            Index(fields=['assigned_to', 'status']),
            Index(fields=['work_order_no']),
        ]
```

#### 4. 订单关联模型（预留）

```python
class Order(models.Model):
    """订单（预留，未来对接订单系统）"""
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    # 关联客户和商机
    customer = ForeignKey(Customer, on_delete=CASCADE, related_name='orders')
    opportunity = ForeignKey(Opportunity, on_delete=SET_NULL, null=True, related_name='orders')

    # 订单信息
    order_no = CharField(max_length=50, unique=True)  # 订单号
    order_type = CharField(max_length=20, choices=[
        ('new_sale', '新购'),
        ('renewal', '续费'),
        ('upgrade', '升级'),
        ('additional', '追加'),
    ])

    # 金额信息
    order_amount = DecimalField(max_digits=15, decimal_places=2)  # 订单金额
    paid_amount = DecimalField(max_digits=15, decimal_places=2, default=0)  # 已付金额
    outstanding_amount = DecimalField(max_digits=15, decimal_places=2, default=0)  # 未付金额

    # 商务信息
    contract_no = CharField(max_length=50, null=True)  # 合同号
    contract_signed_date = DateField(null=True)  # 合同签订日期
    delivery_date = DateField(null=True)  # 交付日期

    # 财务信息
    invoice_status = CharField(max_length=20, choices=[
        ('not_invoiced', '未开票'),
        ('partially_invoiced', '部分开票'),
        ('fully_invoiced', '已开票'),
    ], default='not_invoiced')
    payment_status = CharField(max_length=20, choices=[
        ('unpaid', '未付款'),
        ('partially_paid', '部分付款'),
        ('fully_paid', '已付款'),
    ], default='unpaid')

    # 状态
    status = CharField(max_length=20, choices=[
        ('draft', '草稿'),
        ('confirmed', '已确认'),
        ('in_delivery', '交付中'),
        ('delivered', '已交付'),
        ('closed', '已关闭'),
        ('cancelled', '已取消'),
    ])

    # 外部系统同步
    order_system_id = CharField(max_length=100, unique=True, null=True)  # 订单系统ID
    last_sync_from_order = DateTimeField(null=True)

    # 负责人
    sales_owner = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='owned_orders')

    # 备注
    notes = TextField(null=True)

    # 时间戳
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            Index(fields=['customer', 'status']),
            Index(fields=['order_no']),
            Index(fields=['payment_status']),
        ]
```

### 集成API设计

#### 1. 渠道系统集成API

**CRM → 渠道系统**:
```python
# POST /api/v1/integration/channel/customers
# 推送客户信息到渠道系统
{
    "customer_id": "uuid",
    "name": "客户名称",
    "unified_social_credit_code": "91...",
    "channel_partner_code": "CH001",
    "opportunity_id": "uuid",
    "opportunity_amount": 500000
}

# POST /api/v1/integration/channel/opportunities
# 推送商机信息（用于业绩统计）
{
    "opportunity_id": "uuid",
    "customer_name": "客户名称",
    "channel_partner_code": "CH001",
    "amount": 500000,
    "stage": "closed_won",
    "close_date": "2026-01-20"
}
```

**渠道系统 → CRM**:
```python
# POST /api/v1/integration/channel/partners/sync
# 同步渠道商信息
{
    "partner_code": "CH001",
    "name": "渠道商A",
    "performance_target": 5000000,
    "actual_performance": 3200000,
    "training_records": [...]
}

# POST /api/v1/integration/channel/leads
# 渠道推送线索
{
    "customer_name": "潜在客户X",
    "unified_social_credit_code": "91...",
    "channel_partner_code": "CH001",
    "contact_person": "张总",
    "contact_phone": "138..."
}
```

#### 2. 派工系统集成API

**CRM → 派工系统**:
```python
# POST /api/v1/integration/workorder/create
# 创建派工单
{
    "customer_id": "uuid",
    "customer_name": "客户名称",
    "unified_social_credit_code": "91...",
    "work_type": "implementation",
    "title": "IP-Guard系统实施",
    "description": "...",
    "priority": "high",
    "assigned_by_user_id": "uuid",
    "scheduled_start_date": "2026-01-25"
}
```

**派工系统 → CRM**:
```python
# POST /api/v1/integration/workorder/status
# 更新派工单状态
{
    "work_order_no": "WO202601200001",
    "status": "completed",
    "actual_end_date": "2026-01-30",
    "completion_notes": "实施完成，客户验收通过",
    "customer_satisfaction": 5
}

# POST /api/v1/integration/workorder/feedback
# 派工反馈（更新客户活动记录）
{
    "customer_id": "uuid",
    "work_order_no": "WO202601200001",
    "activity_type": "implementation",
    "activity_date": "2026-01-30",
    "notes": "系统实施完成，培训3人"
}
```

#### 3. 订单系统集成API（预留）

**CRM → 订单系统**:
```python
# POST /api/v1/integration/order/create
# 商机成交后创建订单
{
    "opportunity_id": "uuid",
    "customer_id": "uuid",
    "customer_name": "客户名称",
    "unified_social_credit_code": "91...",
    "order_amount": 500000,
    "product_line": "IP-Guard",
    "sales_owner_id": "uuid"
}
```

**订单系统 → CRM**:
```python
# POST /api/v1/integration/order/status
# 同步订单状态
{
    "order_no": "ORD202601200001",
    "opportunity_id": "uuid",
    "status": "delivered",
    "payment_status": "fully_paid",
    "paid_amount": 500000,
    "invoice_status": "fully_invoiced",
    "delivery_date": "2026-02-15"
}
```

### 数据同步策略

#### 1. 实时同步（事件驱动）

使用消息队列（RabbitMQ/Kafka）实现关键业务事件的实时同步：

**触发事件**:
- 客户创建/更新
- 商机状态变更（特别是成交）
- 派工单创建/完成
- 订单状态变更

**实现方式**:
```python
# Django Signals + Celery + Message Queue
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Opportunity)
def sync_opportunity_to_channel(sender, instance, created, **kwargs):
    if instance.stage == 'closed_won' and instance.customer.channel_relations.exists():
        # 异步推送到渠道系统
        sync_opportunity_to_channel_system.delay(instance.id)
```

#### 2. 定时批量同步

对于非关键数据，使用定时任务进行批量同步：

**同步频率**:
- 渠道业绩数据: 每日凌晨2点
- 派工单状态: 每小时
- 客户主数据校验: 每周日凌晨

**实现方式**:
```python
# Celery Beat定时任务
@shared_task
def sync_channel_performance_daily():
    """每日同步渠道业绩数据"""
    channel_partners = ChannelPartner.objects.filter(is_active=True)
    for partner in channel_partners:
        fetch_and_update_performance(partner)
```

#### 3. 数据一致性保证

**幂等性设计**:
- 所有API接口支持幂等操作
- 使用业务唯一标识（订单号、派工单号）防止重复

**冲突解决策略**:
- 时间戳比较: 最新数据优先
- 主系统优先: 客户主数据以CRM为准
- 人工介入: 关键冲突需要人工确认

**数据校验**:
```python
class IntegrationLog(models.Model):
    """集成日志"""
    id = UUIDField(primary_key=True)
    system_name = CharField(max_length=50)  # channel/workorder/order
    operation = CharField(max_length=20)  # sync/push/pull
    entity_type = CharField(max_length=50)  # customer/opportunity/workorder
    entity_id = CharField(max_length=100)
    status = CharField(max_length=20)  # success/failed/pending
    request_data = JSONField()
    response_data = JSONField(null=True)
    error_message = TextField(null=True)
    created_at = DateTimeField(auto_now_add=True)
```

### 集成架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CRM系统（核心）                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Customer   │  │ Opportunity  │  │   Activity   │         │
│  │  (客户主数据) │  │   (商机)     │  │   (活动)     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │  Integration   │                           │
│                    │     Layer      │                           │
│                    │  (API + MQ)    │                           │
│                    └───────┬────────┘                           │
└────────────────────────────┼──────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  渠道管理系统   │  │  派工管理系统   │  │  订单管理系统   │
│                │  │                │  │   (未来)       │
│ - 渠道商管理   │  │ - 派工单管理   │  │ - 订单管理     │
│ - 业绩统计     │  │ - 任务分配     │  │ - 合同管理     │
│ - 培训记录     │  │ - 服务反馈     │  │ - 财务对账     │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 实施优先级

**Phase 1: 基础集成框架** (Week 5-6)
- 设计统一的集成API接口规范
- 实现IntegrationLog日志系统
- 搭建消息队列基础设施

**Phase 2: 渠道系统集成** (Week 7-8)
- 实现ChannelPartner和CustomerChannelRelation模型
- 开发渠道系统双向同步API
- 实现渠道业绩数据同步

**Phase 3: 派工系统集成** (Week 9-10)
- 实现WorkOrder模型
- 开发派工单创建和状态同步API
- 实现派工反馈到CRM活动记录

**Phase 4: 订单系统预留** (Week 11)
- 设计Order模型结构
- 定义订单系统集成API规范
- 预留数据库表和接口

### 关键技术选型

**消息队列**: RabbitMQ (推荐) 或 Kafka
**API协议**: RESTful API + JSON
**认证方式**: OAuth 2.0 + JWT
**数据格式**: JSON
**同步工具**: Celery + Celery Beat
**监控**: Prometheus + Grafana

## 实施计划

### Phase 1: 后端基础架构搭建 (Week 1-2)
- 数据库模型实现 (Django Models)
- 基础数据结构定义
- PostgreSQL 数据库环境准备

### Phase 2: 核心功能开发 (Week 3-4)
- RESTful API 开发 (DRF)
- LTV 计算逻辑后端实现
- 飞书认证集成

### Phase 3: 系统集成开发 (Week 5-10)
- 渠道系统集成
- 派工系统集成
- 消息队列架构搭建

### Phase 4: 前端重构与集成 (Week 11-12)
- 适配全新后端API
- 实现 LTV 360视图
- 角色权限控制前端适配

## 验证与测试计划

### 功能测试 (Functional Testing)
- 验证飞书登录及组织架构同步
- 验证客户、商机、联系人的增删改查
- 验证 LTV 评分逻辑的准确性
- 验证跨系统数据同步的触发与完成

### 集成测试 (Integration Testing)
- 模拟渠道系统推送线索，验证 CRM 接收与处理
- 模拟 CRM 创建派工单，验证派工系统接单状态回传
- 验证消息队列在网络延迟/失败情况下的补偿机制

### 性能与安全测试
- 支持 100+ 并发用户日常操作
- 敏感数据字段（如渠道佣金）的权限访问控制
- 后端 API 的鉴权逻辑 (JWT)

## 部署与运维策略

### 本地服务器部署 (On-Premise)
- 使用 Docker Compose 进行容器化部署
- 包含 Django, Next.js, PostgreSQL, Redis, RabbitMQ
- 设置自动备份策略（数据库每日备份至本地磁盘）

### 监控与告警
- 集成 Sentry 进行后端错误追踪
- 使用 Prometheus 监控服务器资源使用率
- 飞书机器人告警通知 (系统错误、集成失败)
