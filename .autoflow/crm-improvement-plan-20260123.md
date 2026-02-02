# CRM系统设计方案 - 用户决策确认

## 用户决策记录

基于用户反馈，以下是CRM系统设计的关键决策：

### 1. 系统使用范围
**决策**: 仅公司内部人员使用
- 无需考虑外部用户访问
- 可简化认证和权限设计

### 2. 客户名称唯一性
**决策**: 允许跨租户重复
- 同一租户内客户名称应唯一
- 不同租户间可以有相同客户名称

### 3. LTV模型展示
**决策**: 对外展示分数（0-100分），不展示金额
- LTV最终输出为纯评分（0-100分）
- 必要时LTV计算单独做成微服务
- 当前保持评分制展示

### 4. 技术实现方案
**决策**: 按照最佳实践方案执行
- 后端: Django + DRF + PostgreSQL
- 前端: Next.js 14 + Redux Toolkit + Ant Design

### 5. 线索-商机链路追踪
**决策**: 添加UUID字段实现链路追踪
- 线索(Lead)添加一个类似UUID的字段（如 `tracking_id`）
- 线索转化为商机后，商机使用相同的UUID
- 如果客户有新的线索，使用不同的UUID进行链路区分
- 这样可以追踪完整的销售漏斗转化路径

### 6. 待详细说明的问题
**状态**: 需要进一步明确具体是哪个问题需要详细说明

### 7. 公海池设计
**决策**: 单公海池设计
- 目前保持单公海池（不支持多池）
- 回收规则、领取规则、保护期按最佳实践设计

### 8. 团队层级定义
**决策**: 以销售主管为准
- "本团队"以每个销售主管（manager）为准
- User模型需要添加 `manager` 字段建立层级关系

### 9. 权限设计
**决策**:
- **销售经理**: 只能查看本下属团队的客户
- **售前支持人员**:
  - 对商机有限编辑权限
  - 可以新增跟进记录
  - 不能删除记录
  - 可编辑字段：技术需求、产品配置、方案说明
- **敏感字段**: 只对记录直接关联的角色开放

### 10. 建议采纳
**决策**: 采纳之前提出的建议（具体建议待确认）

### 11. 飞书集成范围
**决策**: 当前阶段仅实现登录+组织同步
- **当前阶段**: 飞书登录认证 + 组织架构同步
- **下一阶段**: 审批流、消息通知、机器人

### 12. 数据冲突处理
**决策**: 以CRM为准，可写回但需确认
- 当CRM与其他系统数据冲突时，以CRM数据为准
- 可以写回到其他系统
- 但写回操作需要销售经理确认

### 13. 数据不足显示规则
**决策**: 数据量少于40%时显示"数据不足，无法评估"
- 当LTV计算所需数据完整度低于40%时
- 不显示评分，而是显示"数据不足，无法评估"
- 修改原设计中的80%阈值为60%（即40%数据缺失）

---

## 待确认问题

### 问题6详细说明
**状态**: 用户已确认忘记具体问题，跳过此项

---

## 专家Review综合改进方案

基于Codex、Gemini、OpenCode三位专家的review意见，以下是需要改进的关键问题：

### Critical Issues（必须修复）

#### 1. User模型缺少团队层级字段
**问题**: 无法实现"本团队"权限范围
**解决方案**:
```python
class User(AbstractUser):
    # 现有字段...

    # 新增：团队层级
    manager = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='team_members')
    # 销售主管，用于确定"本团队"范围

    # 可选：飞书团队ID（如果飞书有团队概念）
    feishu_team_id = CharField(max_length=100, null=True)
```

#### 2. LTV计算逻辑矛盾
**问题**: 文档中混淆了评分和金额
**解决方案**:
- 明确LTV最终输出为纯评分（0-100分）
- 移除"LTV总分 = 潜力评分 + 实际价值(金额)"的表述
- 统一为加权评分系统
- 考虑将LTV计算独立为微服务

#### 3. 数据完整性阈值错误
**问题**: 代码中使用80%阈值，需求是40%
**解决方案**:
```python
def calc_ltv_data_completeness(customer):
    filled_fields = count_filled_ltv_fields(customer)
    total_fields = count_total_ltv_fields()
    completeness_ratio = filled_fields / total_fields

    if completeness_ratio < 0.4:  # 40%阈值
        return "数据不足，无法评估"
    else:
        return calculate_ltv_score(customer)
```

#### 4. 公海池模型不完整
**问题**: 缺少关键字段
**解决方案**:
```python
class Customer(models.Model):
    # 现有字段...

    # 新增：当前公海池状态
    current_pool = ForeignKey(CustomerPool, on_delete=SET_NULL, null=True, blank=True)
    pool_entered_at = DateTimeField(null=True)  # 进入公海池时间

class PoolCustomer(models.Model):
    # 现有字段...

    # 新增：缺失字段
    owner = ForeignKey(User, on_delete=SET_NULL, null=True)  # 公海池负责人（用于权限）
    protection_until = DateTimeField(null=True)  # 保护期到期时间
    last_released_at = DateTimeField(null=True)  # 最后释放时间（用于冷却期）
    last_claimed_at = DateTimeField(null=True)  # 最后领取时间
```

### High Priority Issues（高优先级）

#### 5. 数据库索引缺失
**解决方案**:
```python
class Customer(models.Model):
    class Meta:
        indexes = [
            Index(fields=['account', 'name']),  # 客户名称搜索
            Index(fields=['type', 'status']),   # 筛选
            Index(fields=['industry']),         # 行业分组
            Index(fields=['tier']),             # 客户分级
            Index(fields=['owner']),            # 负责人查询
            Index(fields=['current_pool']),     # 公海池查询
        ]

class Opportunity(models.Model):
    class Meta:
        indexes = [
            Index(fields=['stage', 'probability']),  # 阶段分析
            Index(fields=['amount']),                # 金额排序
            Index(fields=['product_line']),          # 产品线分析
            Index(fields=['expected_close_date']),   # 预计成交日期
        ]

class Activity(models.Model):
    class Meta:
        indexes = [
            Index(fields=['type']),              # 活动类型筛选
            Index(fields=['direction']),         # 方向筛选
            Index(fields=['activity_date']),     # 日期排序
        ]
```

#### 6. 线索-商机链路追踪增强
**解决方案**:
```python
class Opportunity(models.Model):
    # 现有字段...

    # 保留tracking_id用于跨实体分析
    source_tracking_id = UUIDField(null=True, db_index=True)

    # 新增：显式外键关系（便于ORM查询）
    converted_from_lead = ForeignKey(Lead, on_delete=SET_NULL, null=True, related_name='converted_opportunities')
```

#### 7. 飞书集成增强
**问题**: 缺少离职/调岗数据安全机制
**解决方案**:
- 监听飞书 User Status Change 事件
- 设计"资产自动划拨"流程：
  - 检测到用户离职/停用时，触发Celery任务
  - 将其名下客户标记为"待分配"或转交给其上级
  - 自动回收到公海池

#### 8. 数据同步闭环确认机制
**问题**: 缺乏Ack/Callback机制
**解决方案**:
```python
class IntegrationLog(models.Model):
    # 现有字段...

    # 新增：全链路追踪
    correlation_id = UUIDField(default=uuid.uuid4, db_index=True)

    # 新增：确认状态
    sync_status = CharField(max_length=20, choices=[
        ('pending', '待同步'),
        ('sent', '已发送'),
        ('confirmed', '已确认'),  # 外部系统确认接收
        ('failed', '失败'),
    ])

    # 新增：外部系统返回的业务ID
    external_business_id = CharField(max_length=100, null=True)
```

### Medium Priority Issues（中优先级）

#### 9. 售前可编辑字段明确定义
**解决方案**:
```python
# 在Opportunity模型中明确标注
PRESALES_EDITABLE_FIELDS = [
    'technical_requirements',  # 技术需求
    'product_configuration',   # 产品配置
    'solution_description',    # 方案说明
    'technical_notes',         # 技术备注
]

# 在DRF Serializer中实现字段级权限
class OpportunitySerializer(serializers.ModelSerializer):
    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')

        if request and request.user.role == 'presales':
            # 售前只能编辑特定字段
            for field_name in fields:
                if field_name not in PRESALES_EDITABLE_FIELDS:
                    fields[field_name].read_only = True

        return fields
```

#### 10. 导出权限定义
**解决方案**:
```python
# 权限矩阵扩展
EXPORT_PERMISSIONS = {
    'admin': ['all'],
    'sales_manager': ['team_data', 'reports'],
    'sales': ['own_data'],
    'presales': ['related_opportunities'],
    'viewer': [],
}

# 敏感字段过滤
SENSITIVE_FIELDS_EXPORT = [
    'channel_commission',
    'profit_margin',
    'internal_notes',
]
```

#### 11. 客户名称唯一性约束
**解决方案**:
```python
class Customer(models.Model):
    class Meta:
        constraints = [
            UniqueConstraint(
                fields=['account', 'name'],
                name='unique_customer_name_per_account'
            )
        ]
```

### Low Priority Issues（低优先级）

#### 12. API OpenAPI规范（Agent化准备）
**解决方案**:
- 使用drf-spectacular生成OpenAPI 3.0规范
- 为关键API添加详细描述和示例
- 预留AI Agent调用能力

#### 13. 多模态支持预留
**解决方案**:
```python
class Activity(models.Model):
    # 现有字段...

    # 预留：语义向量（使用pgvector扩展）
    content_vector = VectorField(dimensions=1536, null=True)  # OpenAI embedding

    # 预留：附件类型扩展
    attachment_type = CharField(max_length=20, choices=[
        ('text', '文本'),
        ('image', '图片'),
        ('audio', '音频'),
        ('video', '视频'),
        ('file', '文件'),
    ], default='text')
```

---

## LTV微服务架构设计（可选）

### 何时需要微服务化
- LTV计算逻辑复杂度增加（引入ML模型）
- 计算资源密集，影响主业务性能
- 需要独立扩展LTV计算能力

### 架构方案
```
┌─────────────────────────────────────────────────────────┐
│                    Django CRM (主服务)                    │
│  - 客户管理                                               │
│  - 商机管理                                               │
│  - 权限控制                                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ REST API / gRPC
                     ▼
┌─────────────────────────────────────────────────────────┐
│              LTV计算服务 (独立微服务)                      │
│  - FastAPI / Flask                                       │
│  - 接收客户数据                                           │
│  - 执行LTV计算                                            │
│  - 返回评分结果                                           │
│  - 支持批量计算                                           │
└─────────────────────────────────────────────────────────┘
```

### 接口设计
```python
# CRM调用LTV服务
POST /api/ltv/calculate
{
    "customer_id": "uuid",
    "data": {
        "explicit_value": {...},
        "implicit_value": {...},
        "growth_value": {...}
    }
}

# 返回
{
    "ltv_score": 85,
    "ltv_tier": "gold",
    "data_completeness": 0.75,
    "calculated_at": "2026-01-23T12:00:00Z"
}
```

---

## 更新后的实施计划

### Phase 1: 数据模型修复 (Week 1-2) - 已完成 (2026-01-23)
- [x] User模型添加 `manager` 字段
- [x] Customer模型添加 `current_pool`、名称唯一约束
- [x] PoolCustomer模型添加 `owner`、`protection_until`、`last_released_at`
- [x] Lead/Opportunity添加 `tracking_id` 和 `converted_from_lead`
- [x] 添加所有缺失的数据库索引
- [x] 修正LTV数据完整性检查阈值（40%）

### Phase 2: 核心功能开发 (Week 3-4)
- [ ] RESTful API开发
- [ ] LTV计算逻辑修正（纯评分制）
- [ ] 飞书登录+组织同步+离职监听
- [ ] 公海池API（回收/领取/释放）
- [ ] 字段级权限控制（售前可编辑字段）

### Phase 3: 权限与公海池 (Week 5-6)
- [ ] 角色权限矩阵实现（基于manager层级）
- [ ] 敏感字段访问控制
- [ ] 公海池回收定时任务（Celery）
- [ ] 保护期自动延长逻辑
- [ ] 导出权限与敏感字段过滤

### Phase 4: 系统集成 (Week 7-10)
- [ ] 渠道系统集成（含correlation_id追踪）
- [ ] 派工系统集成（含Ack确认机制）
- [ ] 数据冲突处理（CRM为准+写回确认）
- [ ] 飞书离职事件监听与资产划拨

### Phase 5: 前端适配与优化 (Week 11-12)
- [ ] 公海池界面
- [ ] 权限控制前端适配
- [ ] 线索-商机链路可视化
- [ ] LTV数据不足提示
- [ ] OpenAPI文档生成

### Phase 6: LTV微服务化（可选，Week 13-14）
- [ ] LTV服务独立部署
- [ ] API接口对接
- [ ] 批量计算优化
- [ ] 性能测试

---

## 验证计划

### 数据模型验证
- [ ] 创建migration并检查SQL
- [ ] 验证所有索引已创建
- [ ] 测试唯一约束生效

### 权限验证
- [ ] 销售经理只能看到下属团队数据
- [ ] 售前只能编辑指定字段
- [ ] 敏感字段正确过滤

### 公海池验证
- [ ] 30天未跟进自动回收
- [ ] 领取限额生效（50个/人）
- [ ] 保护期内不可回收
- [ ] 冷却期生效（7天）

### LTV计算验证
- [ ] 数据完整度<40%显示"数据不足"
- [ ] 评分范围0-100
- [ ] 分层正确（白金/黄金/白银/青铜）

### 集成验证
- [ ] 飞书离职事件触发资产划拨
- [ ] 外部系统Ack确认机制
- [ ] 数据冲突以CRM为准

---

## 关键文件清单

需要修改的核心文件：

### 数据模型文件
- `/home/jian/project/New-CRM/backend/crm/models/user.py` - User模型（添加manager字段）
- `/home/jian/project/New-CRM/backend/crm/models/customer.py` - Customer模型（添加current_pool、索引、约束）
- `/home/jian/project/New-CRM/backend/crm/models/pool.py` - CustomerPool/PoolCustomer模型（补充字段）
- `/home/jian/project/New-CRM/backend/crm/models/lead.py` - Lead模型（添加tracking_id）
- `/home/jian/project/New-CRM/backend/crm/models/opportunity.py` - Opportunity模型（添加tracking_id、converted_from_lead、索引）
- `/home/jian/project/New-CRM/backend/crm/models/activity.py` - Activity模型（添加索引）
- `/home/jian/project/New-CRM/backend/crm/models/integration.py` - IntegrationLog模型（添加correlation_id、sync_status）

### 业务逻辑文件
- `/home/jian/project/New-CRM/backend/crm/services/ltv_calculator.py` - LTV计算逻辑（修正阈值、纯评分制）
- `/home/jian/project/New-CRM/backend/crm/services/pool_manager.py` - 公海池管理逻辑
- `/home/jian/project/New-CRM/backend/crm/services/permission_checker.py` - 权限检查逻辑（基于manager层级）

### API文件
- `/home/jian/project/New-CRM/backend/crm/api/serializers/opportunity.py` - Opportunity序列化器（字段级权限）
- `/home/jian/project/New-CRM/backend/crm/api/views/pool.py` - 公海池API视图
- `/home/jian/project/New-CRM/backend/crm/api/permissions.py` - 权限类定义

### 定时任务文件
- `/home/jian/project/New-CRM/backend/crm/tasks/pool_recycling.py` - 公海池回收任务
- `/home/jian/project/New-CRM/backend/crm/tasks/feishu_sync.py` - 飞书同步任务（离职监听）

### 配置文件
- `/home/jian/project/New-CRM/backend/config/settings.py` - Django配置（Celery、权限）
- `/home/jian/project/New-CRM/backend/config/celery.py` - Celery配置

---

## 总结

基于三位专家（Codex、Gemini、OpenCode）的review和用户决策，本计划整合了以下关键改进：

### 核心决策
1. **LTV输出**: 纯评分制（0-100分），必要时微服务化
2. **团队定义**: 以销售主管（manager）为准
3. **公海池**: 单池设计
4. **售前权限**: 明确可编辑字段（技术需求、产品配置、方案说明）

### 必须修复的Critical Issues
1. User模型添加manager字段
2. LTV计算逻辑统一为纯评分
3. 数据完整性阈值修正为40%
4. 公海池模型补充owner、protection_until等字段

### 高优先级改进
5. 添加所有缺失的数据库索引
6. 线索-商机链路追踪增强（tracking_id + FK）
7. 飞书离职事件监听与资产划拨
8. 数据同步闭环确认机制（correlation_id + Ack）

### 实施周期
- **Phase 1-5**: 12周（核心功能）
- **Phase 6**: 2周（可选LTV微服务化）

计划已完整，可以开始实施。

---

## 公海池设计方案（最佳实践）

### 1. 公海池概念
公海池是存放无人负责或被回收客户的"池子"，销售人员可以从中领取客户进行跟进。

### 2. 数据模型

```python
class CustomerPool(models.Model):
    """公海池"""
    id = UUIDField(primary_key=True)
    account = ForeignKey(Account, on_delete=CASCADE)

    name = CharField(max_length=100)  # 池名称，如"通用公海池"、"大客户公海池"
    description = TextField(null=True)

    # 规则配置
    rules = JSONField(default=dict)  # 存储回收规则配置

    # 权限配置
    allowed_roles = JSONField(default=list)  # 允许领取的角色
    allowed_departments = JSONField(default=list)  # 允许领取的部门

    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)


class PoolCustomer(models.Model):
    """公海池中的客户"""
    id = UUIDField(primary_key=True)
    pool = ForeignKey(CustomerPool, on_delete=CASCADE)
    customer = ForeignKey(Customer, on_delete=CASCADE)

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

    # 状态
    status = CharField(max_length=20, choices=[
        ('available', '可领取'),
        ('claimed', '已领取'),
        ('protected', '保护期'),
    ])

    class Meta:
        unique_together = ['pool', 'customer']
```

### 3. 回收规则

| 规则类型 | 触发条件 | 默认值 |
|---------|---------|--------|
| 超时未跟进 | 最后跟进日期超过N天 | 30天 |
| 长期无进展 | 商机阶段N天未变化 | 60天 |
| 无有效商机 | 客户无进行中商机超过N天 | 90天 |
| 员工离职 | 负责人离职后自动回收 | 立即 |

### 4. 领取规则

| 规则类型 | 说明 | 默认值 |
|---------|------|--------|
| 每人限额 | 每人最多持有客户数 | 50个 |
| 每日限领 | 每人每日最多领取数 | 5个 |
| 冷却期 | 释放后不可再领取的时间 | 7天 |
| 角色限制 | 只有特定角色可领取 | 销售人员、销售经理 |

### 5. 保护期规则

| 场景 | 保护期 |
|-----|--------|
| 新领取客户 | 15天 |
| 新建商机 | 30天 |
| 有活跃跟进 | 自动延长 |

### 6. 自动化流程

```
┌─────────────────────────────────────────────────────────────┐
│                      定时任务 (每日执行)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  检查所有客户是否满足回收条件                                  │
│  - 最后跟进日期 > 30天?                                       │
│  - 商机阶段 > 60天未变化?                                     │
│  - 无进行中商机 > 90天?                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  满足条件的客户:                                              │
│  1. 发送预警通知给负责人 (提前7天)                             │
│  2. 到期后自动移入公海池                                       │
│  3. 清除原负责人关联                                          │
│  4. 记录回收日志                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 权限矩阵设计

### 1. 角色权限总览

| 功能 | 管理员 | 销售经理 | 销售人员 | 售前支持 | 售后支持 | 只读用户 |
|-----|--------|---------|---------|---------|---------|---------|
| **客户** |
| 查看所有客户 | ✓ | 本团队 | 本人 | 关联商机 | 关联客户 | 本人 |
| 创建客户 | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 编辑客户 | ✓ | 本团队 | 本人 | ✗ | ✗ | ✗ |
| 删除客户 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **商机** |
| 查看商机 | ✓ | 本团队 | 本人 | 关联 | ✗ | 本人 |
| 创建商机 | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 编辑商机 | ✓ | 本团队 | 本人 | 部分字段 | ✗ | ✗ |
| 删除商机 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **跟进记录** |
| 查看记录 | ✓ | 本团队 | 本人 | 关联 | 关联 | 本人 |
| 新增记录 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| 删除记录 | ✓ | 本人 | 本人 | ✗ | ✗ | ✗ |
| **公海池** |
| 查看公海池 | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 领取客户 | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 释放客户 | ✓ | 本团队 | 本人 | ✗ | ✗ | ✗ |

### 2. 敏感字段定义

以下字段仅对直接关联角色开放：

| 字段类型 | 字段名 | 可见角色 |
|---------|--------|---------|
| 财务信息 | 商机金额、实际成交金额 | 负责人、销售经理、管理员 |
| 佣金信息 | 渠道佣金、分成比例 | 负责人、管理员 |
| 内部备注 | internal_notes | 负责人、销售经理、管理员 |
| 联系方式 | 手机号、邮箱 | 负责人、团队成员、管理员 |

### 3. 售前支持商机编辑权限

售前支持人员对关联商机的权限：
- ✓ 可编辑：技术需求、产品配置、方案说明
- ✓ 可新增：跟进记录、技术文档
- ✗ 不可编辑：金额、阶段、预计成交日期
- ✗ 不可删除：任何记录

---

## 线索-商机链路追踪设计

### 1. 数据模型更新

```python
# Lead模型添加
class Lead(models.Model):
    # ... 现有字段 ...

    # 新增：链路追踪ID
    tracking_id = UUIDField(default=uuid.uuid4, db_index=True)
    # 用于追踪从线索到商机的完整转化路径


# Opportunity模型添加
class Opportunity(models.Model):
    # ... 现有字段 ...

    # 新增：关联线索的追踪ID
    source_tracking_id = UUIDField(null=True, db_index=True)
    # 如果商机来源于线索，记录原线索的tracking_id
```

### 2. 转化流程

```
线索创建 → 生成 tracking_id (UUID)
    │
    ▼
线索跟进 → tracking_id 不变
    │
    ▼
转化为商机 → 商机的 source_tracking_id = 线索的 tracking_id
    │
    ▼
同一客户新线索 → 生成新的 tracking_id (区分不同销售周期)
```

### 3. 分析价值

- 追踪线索转化率
- 分析各渠道线索质量
- 计算销售周期时长
- 识别高效转化路径

---

## 数据完整性检查更新

### 原设计
```python
# 如果 >80% 字段缺失，标记为"数据不足"
missing_ratio = count_missing_fields / total_ltv_fields
return "Insufficient" if missing_ratio > 0.8 else "Sufficient"
```

### 更新后（基于用户决策）
```python
# 如果数据完整度 <40%（即缺失率>60%），显示"数据不足，无法评估"
completeness_ratio = count_filled_fields / total_ltv_fields
if completeness_ratio < 0.4:
    return "数据不足，无法评估"
else:
    return calculate_ltv_score()
```

---

## 实施计划更新

### Phase 1: 后端基础架构 (Week 1-2) - 已完成 (2026-01-23)
- [x] 数据库模型实现
- [x] **新增**: Lead/Opportunity添加tracking_id字段
- [x] **新增**: CustomerPool/PoolCustomer模型
- [x] **更新**: 数据完整性检查阈值调整

### Phase 2: 核心功能开发 (Week 3-4)
- [ ] RESTful API开发
- [ ] LTV计算逻辑（含数据不足判断）
- [ ] 飞书登录+组织同步
- [ ] **新增**: 公海池API

### Phase 3: 权限与公海池 (Week 5-6)
- [ ] 角色权限矩阵实现
- [ ] 敏感字段访问控制
- [ ] 公海池回收定时任务
- [ ] 公海池领取/释放功能

### Phase 4: 系统集成 (Week 7-10)
- [ ] 渠道系统集成
- [ ] 派工系统集成
- [ ] 数据冲突处理（CRM为准+写回确认）

### Phase 5: 前端适配 (Week 11-12)
- [ ] 公海池界面
- [ ] 权限控制前端适配
- [ ] 线索-商机链路可视化
