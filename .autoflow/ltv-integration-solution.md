# LTV计算逻辑与集成架构改进方案

> 评审日期：2026-01-21
> 参与：Claude (协调), Codex (后端), Gemini (集成), OpenCode (业务逻辑)
> 状态：已确认

---

## 一、LTV计算逻辑改进方案

### 1.1 数据完整度分层策略（双轨制）

| 层级 | LTV分数要求 | 数据完整度要求 | 置信度 |
|------|------------|---------------|--------|
| 白金 (Platinum) | ≥80分 | ≥80% | 高 |
| 黄金 (Gold) | ≥60分 | ≥70% | 高 |
| 白银 (Silver) | ≥40分 | ≥50% | 中 |
| 青铜 (Bronze) | ≥0分 | ≥40% | 中 |
| 数据不足 (Insufficient) | - | <40% | 低 |

**特殊规则**：
- 新客户前6个月为"潜力期"，数据完整度要求降低50%
- LTV分数不因数据不足而降低，保持对高潜力客户的识别能力

### 1.2 客户类型差异化权重矩阵

| 客户类型 | 显性价值 | 隐性价值 | 增长价值 | 备注 |
|---------|---------|---------|---------|------|
| 政府客户 | 35% | 50% | 15% | 隐性价值更重要 |
| 事业单位 | 45% | 40% | 15% | 历史业绩是关键 |
| 企业客户 | 40% | 40% | 20% | 标准权重 |
| 战略客户 | - | - | - | 所有分数×1.2（上限100） |

### 1.3 产品线系数配置（配置表方案）

```python
class ProductLineConfig(models.Model):
    """产品线LTV系数配置"""
    product_line = models.CharField('产品线名称', max_length=50, unique=True)
    ltv_coefficient = models.DecimalField('LTV系数', max_digits=3, decimal_places=2, default=0.9)
    is_active = models.BooleanField('是否启用', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'crm_product_line_config'
        verbose_name = '产品线配置'
```

**初始配置数据**：

| 产品线 | 系数 |
|--------|------|
| IP-Guard | 1.1 |
| AnyShare | 1.1 |
| AnyBackup | 1.1 |
| (默认/其他) | 0.9 |

### 1.4 安全计算边界

```python
def safe_float(value, default=0):
    """安全的浮点数转换，处理NaN和None"""
    if value is None:
        return default
    try:
        result = float(value)
        if result != result:  # NaN检查
            return default
        return result
    except (ValueError, TypeError):
        return default

def calc_safe_cagr(revenue_2022, revenue_2023, revenue_2024) -> float:
    """安全的CAGR计算，处理零值和负值"""
    r2 = safe_float(revenue_2022)
    r3 = safe_float(revenue_2023)
    r4 = safe_float(revenue_2024)

    if r2 <= 0:
        return 0.0

    try:
        growth_2023 = (r3 - r2) / r2 if r2 > 0 else 0
        growth_2024 = (r4 - r3) / r3 if r3 > 0 else 0
        avg_growth = (growth_2023 + growth_2024) / 2
    except ZeroDivisionError:
        return 0.0

    # 限制范围：[-100%, 1000%]
    return max(-1.0, min(10.0, avg_growth))

def normalize_score(raw_score: float) -> float:
    """归一化到0-100"""
    return max(0.0, min(100.0, raw_score))
```

### 1.5 增长价值加权公式

```python
def get_product_coefficient(product_line: str) -> float:
    """获取产品线系数（从配置表读取）"""
    try:
        config = ProductLineConfig.objects.get(product_line=product_line, is_active=True)
        return float(config.ltv_coefficient)
    except ProductLineConfig.DoesNotExist:
        return 0.9  # 默认系数

def get_stage_maturity(stage: str) -> float:
    """获取阶段成熟度"""
    stage_map = {
        'initial_contact': 0.5,    # 初步接触
        'requirement': 0.7,         # 需求确认
        'proposal': 0.9,            # 方案设计
        'negotiation': 1.0,         # 谈判
        'closed_won': 1.0,          # 赢单
    }
    return stage_map.get(stage, 0.5)

def calc_opportunity_score(opportunities: list) -> float:
    """计算机会得分（0-10分）"""
    score = 0.0
    for opp in opportunities:
        amount = safe_float(opp.get('amount'))
        probability = safe_float(opp.get('probability', 100)) / 100
        product_line = opp.get('product_line', '')
        stage = opp.get('stage', 'initial_contact')

        coefficient = get_product_coefficient(product_line)
        stage_maturity = get_stage_maturity(stage)

        score += (amount * probability * coefficient * stage_maturity) / 120000

    return min(10.0, score)
```

### 1.6 增量计算策略

**触发条件**：
- 商机状态变更为"赢单"
- 新增/修改活动记录
- 客户状态变更
- 订单新增/修改

**批量调度策略**：

| 优先级 | 客户类型 | 更新频率 |
|--------|---------|---------|
| 高 | 白金/黄金客户 | 每日增量更新 |
| 中 | 所有客户 | 每周全量校验 |
| 低 | 历史记录 | 每月归档 |

```python
class LTVRecalculationQueue:
    """LTV重算队列管理"""

    def enqueue_customer(self, customer_id, priority=False):
        """加入重算队列"""
        if priority:
            self.priority_customers.add(customer_id)
        self.pending_customers.add(customer_id)

    def process_batch(self, batch_size=50):
        """批量处理重算（每5分钟执行）"""
        # 优先处理高价值客户
        to_process = list(self.priority_customers)[:batch_size]
        remaining = batch_size - len(to_process)

        if remaining > 0:
            to_process.extend(
                list(self.pending_customers - self.priority_customers)[:remaining]
            )

        for customer_id in to_process:
            recalculate_ltv(customer_id)
            self.pending_customers.discard(customer_id)
            self.priority_customers.discard(customer_id)
```

### 1.7 "数据不足"层级业务处理流程

1. **UI展示**：'数据不足'徽章 + 缺失字段高亮
2. **分阶段补全**：
   - 阶段1（核心5项）：行业、规模、营收历史、决策人信息
   - 阶段2（增强5项）：IT预算、竞争对手、关系层级
   - 阶段3（预测5项）：未来机会、增长趋势
3. **激励机制**：补全阶段1后，LTV分数临时上浮10%（持续3个月）
4. **自动任务**：新客户自动创建"数据完善任务"，分配给销售人员

---

## 二、集成架构改进方案

### 2.1 事务发件箱模式 (Transactional Outbox)

**架构图**：
```
┌──────────────────┐          ┌───────────────────────────────────┐
│   CRM Database   │          │          Message Relay            │
│ ┌──────────────┐ │   CDC/   │ ┌──────────────┐   ┌────────────┐ │
│ │ Business Tbl │ │  Poll    │ │  Event Reader│──►│ Publisher  │ │
│ ├──────────────┤ │─────────►│ └──────────────┘   └──────┬─────┘ │
│ │ Outbox Tbl   │ │          │                           │       │
│ └──────────────┘ │          └───────────────────────────┼───────┘
└────────▲─────────┘                                      │
         │ Transaction                                    ▼
┌────────┴─────────┐                             ┌───────────────┐
│   CRM Application│                             │   RabbitMQ    │
└──────────────────┘                             └───────────────┘
```

**OutboxEvent 数据模型**：
```python
class OutboxEvent(models.Model):
    """事务发件箱事件表"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    aggregate_type = models.CharField(max_length=50)  # 'workorder', 'customer', 'opportunity'
    aggregate_id = models.CharField(max_length=100)
    event_type = models.CharField(max_length=50)      # 'created', 'updated', 'status_changed'
    payload = models.JSONField()
    status = models.CharField(max_length=20, default='pending')  # pending/published/failed
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True)
    retry_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'crm_outbox_event'
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]
```

**工作流程**：
1. 业务事务开启
2. 保存/更新业务数据
3. 插入记录到 OutboxEvent 表
4. 提交业务事务
5. Relay Worker 轮询 OutboxEvent
6. 发布消息到 RabbitMQ
7. 更新 OutboxEvent 状态为 'published'

### 2.2 同步策略协调

**策略**：实时优先，批量兜底

| 同步方式 | 用途 | 触发条件 |
|---------|------|---------|
| 实时推送 | 主同步通道 | 状态变更立即触发 |
| 批量对账 | 修复机制 | 每日低峰期运行 |

**批量对账逻辑**：
```python
def reconcile_workorders():
    """每日对账：仅拉取 ID + 版本号 + 状态哈希"""
    remote_summary = fetch_remote_summary()  # {id: (version, hash)}
    local_summary = get_local_summary()

    for wo_id, (remote_ver, remote_hash) in remote_summary.items():
        local_ver, local_hash = local_summary.get(wo_id, (0, None))

        if local_ver < remote_ver or local_hash != remote_hash:
            # 仅此时才拉取全量详情
            full_data = fetch_remote_detail(wo_id)
            update_local_workorder(wo_id, full_data)
```

### 2.3 冲突解决机制（版本号乐观锁）

```python
def handle_incoming_update(incoming_data: dict, local_record):
    """处理外部更新"""
    incoming_version = incoming_data.get('version', 0)
    local_version = local_record.version

    if incoming_version > local_version:
        # 接受更新
        local_record.update_from(incoming_data)
        local_record.version = incoming_version
        local_record.save()
        return 'accepted'

    elif incoming_version < local_version:
        # 拒绝更新（过期消息）
        logger.warning(f"Stale message rejected: {incoming_version} < {local_version}")
        return 'rejected_stale'

    else:
        # 幂等忽略
        return 'ignored_idempotent'
```

### 2.4 数据冲突业务规则

| 字段类型 | 权威来源 | 冲突处理 |
|---------|---------|---------|
| 客户地址 | 渠道系统 | CRM保留历史记录 |
| 业绩数据 | 渠道系统 | 差异>5%触发人工审核 |
| 联系人信息 | CRM | 渠道保留独立字段 |

**冲突优先级**：

| 级别 | 类型 | 处理时限 |
|------|------|---------|
| P0 | 影响财务结算 | 立即人工介入 |
| P1 | 影响客户服务 | 4小时内处理 |
| P2 | 影响数据分析 | 24小时内处理 |

### 2.5 死信队列与重试策略

**重试策略**：指数退避
```
1s → 5s → 30s → 1min → 5min（最大5次）
```

**DLQ处理流程**：
1. 超过最大重试次数 → 路由至死信队列
2. 存储至 `FailedMessage` 表
3. 触发飞书/Sentry告警
4. Admin界面支持"一键重放"或"丢弃"

```python
class FailedMessage(models.Model):
    """死信消息记录"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    queue_name = models.CharField(max_length=100)
    message_id = models.CharField(max_length=100)
    payload = models.JSONField()
    error_message = models.TextField()
    error_traceback = models.TextField()
    retry_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True)
    resolution = models.CharField(max_length=20, null=True)  # replayed/discarded

    class Meta:
        db_table = 'crm_failed_message'
```

### 2.6 降级策略

| 系统故障 | 降级方案 | 恢复策略 |
|---------|---------|---------|
| 渠道系统宕机 | 本地标记"待同步" | 24小时后人工补录 |
| 派工系统异常 | 提供人工派工功能 | 恢复后自动同步 |
| 订单系统故障 | 临时订单记录 | 恢复后自动校验 |

### 2.7 告警升级规则

| 时间 | 升级对象 |
|------|---------|
| 1小时未解决 | 部门经理 |
| 4小时未解决 | 技术总监 |

**告警触发条件**：
- LTV分数突增/突降超过30%
- 高价值客户LTV层级下降
- 渠道系统宕机超过2小时
- 派工系统连续失败超过5次
- 数据冲突P0级别未解决超过1小时

---

## 三、API标准化规范

### 3.1 成功响应格式
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}
```

### 3.2 错误响应格式（RFC 7807）
```json
{
  "type": "https://crm.example.com/probs/validation-error",
  "title": "Invalid Parameter",
  "status": 400,
  "detail": "WorkOrder priority must be one of [low, medium, high].",
  "instance": "/api/v1/workorders/WO202601",
  "trace_id": "req_8f9a2b3c",
  "errors": [
    {
      "field": "priority",
      "code": "invalid_choice",
      "message": "Invalid value 'critical'"
    }
  ]
}
```

---

## 四、监控阈值

| 监控项 | 告警阈值 |
|--------|---------|
| LTV单次计算耗时 | >5秒 |
| LTV批量计算失败率 | >5% |
| 数据同步延迟（高价值） | >5分钟 |
| 数据同步延迟（普通） | >30分钟 |
| API错误率 | >1% |
| API响应时间 | >1秒 |
| 数据完整度<60%客户占比 | >30% |

---

## 五、实施优先级

### 第一阶段（关键）
1. 实施事务发件箱模式
2. 添加LTV计算安全边界和归一化
3. 实施数据完整度分层策略
4. 创建ProductLineConfig配置表

### 第二阶段（重要）
5. 实施版本号乐观锁冲突解决
6. 添加死信队列和重试策略
7. 实施增量LTV计算
8. 添加客户类型权重矩阵

### 第三阶段（优化）
9. 实施批量对账机制
10. 添加"数据不足"业务流程
11. 完善告警和监控
12. API标准化改造
