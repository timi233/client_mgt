# CRM系统设计方案 - 审查报告

审查日期: 2026-01-23
审查人: OpenCode
设计文档: CRM系统-全新设计方案.md
计划文件: abundant-humming-moon.md

---

## 风险问题 (Risks)

### 1. 数据模型层

**R1: CustomerPool/PoolCustomer设计不完整**
- **位置**: 仅存在于计划文件，未整合到主设计文档
- **风险**: 开发时可能遗漏这两个关键模型
- **影响**: 公海池功能无法实现
- **优先级**: 高

**R2: 缺少Customer.current_pool字段**
- **问题**: 判断客户是否在公海池需关联查询PoolCustomer表
- **风险**: 查询性能下降，代码复杂度增加
- **影响**: 客户列表、权限检查变慢
- **优先级**: 高

**R3: PoolCustomer缺少关键字段**
- **缺失字段**:
  - `owner`: 当前池客户的归属者（用于"本团队"权限判断）
  - `protection_until`: 保护期到期时间（规则中定义了15-30天）
  - `last_released_at`: 最后释放时间（用于7天冷却期判断）
- **风险**: 回收、领取、保护期规则无法完整实现
- **优先级**: 高

**R4: User模型缺少团队层级字段**
- **现状**: 仅有department_id/department_name
- **缺失字段**:
  - `manager_id`: 上级经理（自关联）
  - `team_id`: 团队ID（从飞书同步）
- **风险**: "销售经理只能查看本下属团队的客户"无法实现
- **影响**: 权限控制核心功能失效
- **优先级**: 严重

**R5: LTV计算逻辑矛盾**
- **矛盾点**:
  - Line 584: `LTV总分 = 潜力评分(0-100分) + 实际价值(金额)`
  - Line 661: "LTV最终结果为评分(0-100分)，不是货币金额"
- **风险**: 前后端实现不一致，开发混乱
- **优先级**: 严重

**R6: Customer模型缺少LTV输入字段**
- **问题**: Lines 748-772定义的LTV计算所需字段（如revenue_2022_wan、industry_position等）未在Customer模型(122-207行)中定义
- **风险**: LTV计算无法获取输入数据
- **优先级**: 高

### 2. 索引与性能

**R7: 缺少关键数据库索引**

**Customer表缺失**:
- `(account, name)` - 客户名称搜索
- `(type, status)` - 客户筛选
- `(industry)` - 行业统计
- `(tier)` - 分层分析

**Opportunity表缺失**:
- `(amount)` - 商机金额排序
- `(probability)` - 成交概率筛选
- `(product_line)` - 产品线分析
- `(stage, probability)` - 复合筛选

**Activity表缺失**:
- `(type)` - 活动类型筛选
- `(direction)` - 来电/外呼分析

**风险**: 随着数据量增长，查询性能会显著下降
**优先级**: 中高

### 3. 权限设计

**R8: 权限矩阵不完整**
- **缺失项**:
  - 导出权限（CSV、Excel等）未定义任何角色权限
  - 仪表盘数据范围未定义
- **风险**: 数据泄露风险或功能无法使用
- **优先级**: 中

**R9: 售前支持"部分字段"未明确**
- **问题**: 仅说明"部分字段"可编辑，未列出具体字段名
- **风险**: 前端后端实现可能不一致
- **优先级**: 中

**R10: 敏感字段可见性逻辑不清晰**
- **问题**: "联系方式：手机号、邮箱 - 负责人、团队成员、管理员"
- **风险**: 未定义如何判断团队成员关系，可能导致权限越界
- **优先级**: 中

**R11: 渠道佣金字段列为敏感但未定义**
- **问题**: 敏感字段表列出"渠道佣金、分成比例"，但Customer/Opportunity模型中无此字段
- **风险**: 敏感字段控制逻辑无法实现
- **优先级**: 低

### 4. 公海池规则

**R12: PoolCustomer.unique_together限制过多**
- **限制**: `unique_together=['pool', 'customer']`
- **问题**: 同一客户只能在唯一公海池中
- **风险**: 无法实现"优先级池" vs "通用池"等复杂场景
- **优先级**: 低

---

## 优化建议 (Optimizations)

### 1. 数据模型优化

**O1: Customer模型添加字段**
```python
# 添加公海池快速查询
current_pool = ForeignKey(CustomerPool, on_delete=SET_NULL, null=True, related_name='current_customers')
pool_status = CharField(max_length=20, choices=[
    ('in_pool', '在池中'),
    ('owned', '已认领'),
    ('protected', '保护期'),
], default='owned')
pool_status_changed_at = DateTimeField(null=True)

# 添加LTV输入字段（基于Lines 748-772）
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

**O2: User模型添加团队层级**
```python
# 添加团队层级
manager = ForeignKey('self', on_delete=SET_NULL, null=True, related_name='direct_reports')
team_id = CharField(max_length=100, null=True)  # 飞书团队ID
team_name = CharField(max_length=200, null=True)
```

**O3: PoolCustomer模型补充字段**
```python
# 添加归属者（用于"本团队"权限）
owner = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='pool_owned_customers')

# 添加保护期追踪
protection_until = DateTimeField(null=True)

# 添加冷却期追踪
last_released_at = DateTimeField(null=True)
last_claimed_at = DateTimeField(null=True)
```

**O4: Opportunity模型添加显式关联**
```python
# 保留tracking_id的同时添加显式FK
converted_from_lead = ForeignKey(Lead, on_delete=SET_NULL, null=True, related_name='converted_opportunities')
```

### 2. 索引优化

**O5: 补充关键索引**
```python
# Customer
Index(fields=['account', 'name'])
Index(fields=['account', 'is_deleted'])
Index(fields=['type', 'status'])
Index(fields=['industry'])
Index(fields=['tier'])
Index(fields=['owner', 'status'])
Index(fields=['next_action_date'])
Index(fields=['health_score'])

# Opportunity
Index(fields=['customer', 'stage'])
Index(fields=['owner', 'stage'])
Index(fields=['expected_close_date'])
Index(fields=['amount'])
Index(fields=['probability'])
Index(fields=['product_line'])
Index(fields=['stage', 'probability'])

# Activity
Index(fields=['customer', 'activity_date'])
Index(fields=['owner', 'activity_date'])
Index(fields=['next_action_date'])
Index(fields=['type'])
Index(fields=['direction'])

# Lead
Index(fields=['tracking_id'])
Index(fields=['status'])

# Opportunity
Index(fields=['source_tracking_id'])
```

### 3. LTV计算优化

**O6: 明确LTV计算逻辑**
- **建议**: 采用纯评分制（0-100分），与用户决策一致
- **输出**:
  - `ltv_score`: 0-100整数
  - `ltv_tier`: platinum/gold/silver/bronze
- **Revenue字段**: 用于内部计算和报表，不对外展示

### 4. 权限优化

**O7: 补充权限矩阵**
```markdown
| 功能 | 管理员 | 销售经理 | 销售人员 | 售前支持 | 售后支持 | 只读用户 |
|-----|--------|---------|---------|---------|---------|---------|
| 数据导出 | ✓ | 本团队 | 本人 | 关联 | 关联 | 本人 |
| 仪表盘查看 | 全部 | 全部 | 本人 | 关联 | 关联 | 本人 |
```

**O8: 明确售前可编辑字段**
```python
PRESALES_EDITABLE_FIELDS = [
    'description',          # 商机描述
    'competitive_advantage',  # 竞争优势
    'notes',                # 备注
    # 通过Activity模型新增:
    # - 技术需求
    # - 产品配置
    # - 方案说明
]
```

**O9: 定义团队成员判断逻辑**
```python
def is_team_member(user: User, target: User) -> bool:
    """判断是否为团队成员"""
    # 同一团队ID（飞书同步）
    if user.team_id and user.team_id == target.team_id:
        return True
    # 下级关系
    if target.manager_id == user.id:
        return True
    # 客户团队协作
    return Customer.objects.filter(
        owner=user,
        team_members__contains=target
    ).exists()
```

### 5. 公海池优化

**O10: 优化回收规则触发机制**
```python
# 使用Celery Beat定时任务
@shared_task
def check_and_recycle_customers():
    """每日检查并回收客户"""
    # 超时未跟进（30天）
    recycle_timeout_customers()
    # 长期无进展（60天）
    recycle_no_progress_customers()
    # 无有效商机（90天）
    recycle_no_opportunity_customers()
```

**O11: 领取规则实现**
```python
def can_claim_customer(user: User, customer: Customer) -> tuple[bool, str]:
    """检查用户是否可以领取客户"""
    # 角色检查
    if user.role not in ['admin', 'sales_manager', 'sales']:
        return False, "无领取权限"

    # 持有数限制（50个）
    if user.owned_customers.filter(pool_status='owned').count() >= 50:
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
```

**O12: 保护期自动延长**
```python
def extend_protection_period(customer: Customer):
    """有活跃跟进时延长保护期"""
    pool_customer = customer.poolcustomer_set.first()
    if pool_customer and pool_customer.status == 'protected':
        # 延长30天保护期
        pool_customer.protection_until = timezone.now() + timedelta(days=30)
        pool_customer.save()
```

---

## 待确认问题 (Questions)

### Q1: LTV最终输出形式
- **问题**: LTV总分应该输出什么？
- **选项**:
  - A: 纯评分 0-100（与用户决策一致）
  - B: 货币金额 + 评分分层
- **影响**: 前端展示、排序逻辑
- **建议**: 采用A，纯评分制

### Q2: 公海池多池策略
- **问题**: 是否需要支持同一客户在多个公海池中？
- **场景**: "优先级池"（高价值客户） vs "通用池"
- **当前**: `unique_together=['pool', 'customer']` 限制了只能在一个池
- **建议**: 保持单一池设计，通过`priority`字段区分

### Q3: 团队定义方式
- **问题**: "本团队"如何定义？
- **选项**:
  - A: 基于飞书team_id（推荐，简单直接）
  - B: 基于manager_id层级关系
  - C: 基于department_id + 手动分配
- **建议**: A + B 组合使用

### Q4: 导出权限范围
- **问题**: 导出功能应该允许哪些角色导出哪些数据？
- **选项**:
  - A: 所有角色只能导出自己可见的数据
  - B: 仅管理员和经理可以导出
  - C: 所有角色都可以导出，但敏感字段自动过滤
- **建议**: A + C 组合

### Q5: 售前支持可编辑字段清单
- **问题**: 售前支持人员对商机可以编辑哪些具体字段？
- **待确认字段**:
  - 技术需求（需新增字段）
  - 产品配置（需新增字段）
  - 方案说明（是否用description字段？）
  - competitive_advantage（竞争优势）
  - notes（备注）
- **建议**: 明确列出字段清单

### Q6: 冷却期计算起点
- **问题**: 7天冷却期从何时开始计算？
- **选项**:
  - A: 从客户释放到公海池时
  - B: 从原负责人最后一次操作该客户时
  - C: 从原负责人释放该客户时（手动释放）
- **建议**: A，从释放到池开始计算

### Q7: 保护期触发条件
- **问题**: 保护期在哪些场景下自动延长？
- **当前**: "有活跃跟进 - 自动延长"
- **待确认**:
  - 什么算"活跃跟进"？（新增Activity？更新商机？）
  - 延长多少天？（固定30天？递增？）
  - 是否有上限？
- **建议**: 新增Activity即延长30天，无上限

### Q8: 跟踪ID vs 显式外键
- **问题**: Opportunity使用tracking_id还是converted_from_lead FK？
- **当前设计**: tracking_id (UUID) + source_tracking_id
- **建议**: 两者并存
  - `converted_from_lead` FK: 用于快速查询和ORM操作
  - `tracking_id`: 用于跨实体链路分析和报表

### Q9: 客户名称唯一性范围
- **问题**: 客户名称在同租户内是否必须唯一？
- **当前**: 计划文件说"同一租户内客户名称应唯一"
- **设计文档**: 未添加unique约束
- **建议**: 添加account-level unique约束或通过业务逻辑保证

### Q10: 公海池回收提前通知
- **问题**: 回收前是否需要提前通知负责人？
- **当前**: 自动化流程图中提到"提前7天发送预警"
- **待确认**:
  - 通知方式？（飞书消息？系统内通知？邮件？）
  - 是否可阻止回收？
  - 通知频率？
- **建议**: 飞书机器人 + 系统内通知，不可阻止

---

## 总结

### 严重风险 (需立即解决)
1. User模型缺少团队层级字段 (R4)
2. LTV计算逻辑矛盾 (R5)
3. CustomerPool模型不完整 (R1-R3)
4. 缺少关键数据库索引 (R7)

### 高优先级 (早期迭代解决)
1. Customer模型缺少LTV输入字段 (R6)
2. CustomerPool整合到主设计文档 (R1)
3. 权限矩阵补充导出权限 (R8)

### 中优先级 (正常迭代解决)
1. 售前支持字段清单明确 (R9)
2. 敏感字段可见性逻辑 (R10)
3. 公海池规则细节 (Q6-Q7)

### 低优先级 (后续优化)
1. 渠道佣金字段定义 (R11)
2. 公海池多池策略 (Q2)
3. 冷却期计算方式 (Q6)

---

## 下一步行动

### 必须完成 (阻塞开发)
- [ ] 修复LTV计算逻辑矛盾
- [ ] User模型添加manager_id和team_id
- [ ] CustomerPool/PoolCustomer模型补充字段
- [ ] Customer模型添加LTV输入字段
- [ ] Customer模型添加current_pool相关字段
- [ ] 补充关键数据库索引
- [ ] 将CustomerPool设计整合到主设计文档

### 建议完成 (提升质量)
- [ ] 明确售前支持可编辑字段清单
- [ ] 补充权限矩阵导出权限
- [ ] 定义团队成员判断逻辑
- [ ] 明确保护期延长触发条件
- [ ] 确认导出权限范围

### 可选完成 (锦上添花)
- [ ] Opportunity添加converted_from_lead FK
- [ ] 客户名称唯一性约束
- [ ] 公海池多池策略调研
