# 技术方案Review问题清单

> 文档创建时间: 2025-01-26
> Review范围: 
> - `核心功能技术方案.md` (1200行)
> - `待沟通事项.md` (234行)
> - `技术决策-最终方案.md` (251行)

---

## 严重问题 (严重性: 严重 | 优先级: P0)

### 1. OneToOneField 关系方向错误

**位置**: `核心功能技术方案.md` - 第3节 LTV计算引擎 - 数据模型设计

**问题描述**:
```python
class CustomerLTVProfile(models.Model):
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)  # 错误: 应为OneToOneField

class CustomerLTV(models.Model):
    profile = models.ForeignKey('CustomerLTVProfile', on_delete=models.CASCADE)  # 错误: 应为OneToOneField
```

**影响**:
- 违反业务语义：一个Customer只能有一个LTVProfile
- 导致数据不一致：可能创建多个Profile记录
- 查询逻辑混乱：无法使用反向关系名直接访问

**建议修复**:
```python
class CustomerLTVProfile(models.Model):
    customer = models.OneToOneField('Customer', on_delete=models.CASCADE, related_name='ltv_profile')

class CustomerLTV(models.Model):
    profile = models.OneToOneField('CustomerLTVProfile', on_delete=models.CASCADE, related_name='current_ltv')
```

**优先级**: P0 (必须在MVP前修复)

---

### 2. 缺少核心表索引

**位置**: `核心功能技术方案.md` - 多处

**问题描述**:
以下高频查询字段缺少复合索引：
- Opportunity表: `(tenant_id, owner_id, status)` - 常用于查看"我的商机"
- Opportunity表: `(tenant_id, customer_id, stage)` - 常用于查看客户商机列表
- Customer表: `(tenant_id, owner_id, is_deleted)` - 常用于查看"我的客户"
- Activity表: `(tenant_id, customer_id, activity_date)` - 常用于客户活动时间线

**影响**:
- 数据量>10万后查询性能急剧下降
- 可能导致数据库锁等待
- 用户体验差（列表加载慢）

**建议修复**:
在Meta中添加indexes:
```python
class Opportunity(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'owner_id', 'status']),
            models.Index(fields=['tenant_id', 'customer_id', 'stage']),
        ]
```

**优先级**: P0 (MVP上线前必须添加)

---

### 3. Tenant上下文在后台任务中丢失

**位置**: `核心功能技术方案.md` - 第10节 多租户隔离 - 关键技术点

**问题描述**:
Celery后台任务中直接从User获取tenant_id，但异步任务可能丢失请求上下文：
```python
@shared_task
def sync_feishu_data(user_id, tenant_id):  # 需要手动传递tenant_id
    user = User.objects.get(id=user_id)
    # 如果依赖 user.tenant_id 可能出错
```

**影响**:
- 后台任务可能操作错误租户的数据
- 数据安全风险
- 难以排查的多租户数据泄漏

**建议修复**:
```python
class TenantAwareManager(models.Manager):
    def get_queryset(self):
        from .utils import get_current_tenant_id
        queryset = super().get_queryset()
        tenant_id = get_current_tenant_id()
        if tenant_id:
            return queryset.filter(tenant_id=tenant_id)
        return queryset

# 在Celery任务中显式设置租户上下文
from .context import set_current_tenant_id

@shared_task
def sync_feishu_data(tenant_id):
    set_current_tenant_id(tenant_id)  # 显式设置
    # 后续ORM操作会自动过滤
```

**优先级**: P0 (安全相关)

---

### 4. 缺少审计字段

**位置**: `核心功能技术方案.md` - 第6节 CPQ模块、第7节 合同管理 等

**问题描述**:
核心业务表缺少标准审计字段：
- Product表: 无 `created_at`, `updated_at`
- Quote表: 无 `created_at`, `updated_at`
- Contract表: 无 `created_at`, `updated_at`
- Customer表: 无 `updated_by` (记录最后修改人)

**影响**:
- 无法追踪数据变更历史
- 难以满足审计合规要求
- 排查问题时缺少时间线索

**建议修复**:
添加抽象基类:
```python
class AuditModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('User', null=True, on_delete=models.SET_NULL, related_name='created_%(class)s')
    updated_by = models.ForeignKey('User', null=True, on_delete=models.SET_NULL, related_name='updated_%(class)s')

    class Meta:
        abstract = True

class Product(AuditModel):
    # 业务字段...
```

**优先级**: P0 (MVP前必须修复)

---

### 5. 缺少软删除支持

**位置**: `核心功能技术方案.md` - 多处

**问题描述**:
Customer等核心表未考虑软删除：
```python
class Customer(models.Model):
    # 无 is_deleted 字段
    # 无 deleted_at 字段
```

**影响**:
- 删除后无法恢复数据
- 历史数据（如已关闭的商机）因客户被删除而失效
- 无法满足"数据保留期"合规要求

**建议修复**:
```python
class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('User', null=True, on_delete=models.SET_NULL)

    def soft_delete(self, user=None):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        if user:
            self.deleted_by = user
        self.save()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['-deleted_at']),  # 软删除索引
        ]
```

**优先级**: P0 (MVP前必须修复)

---

### 10. 缺少并发控制

**位置**: `核心功能技术方案.md` - 第6节 CPQ模块、第7节 合同管理

**问题描述**:
Quote、Contract等可能被多人同时编辑的表缺少乐观锁：
```python
class Quote(models.Model):
    # 无 version 字段
    status = models.CharField(...)  # 可能并发修改导致状态错乱
```

**影响**:
- 两人同时编辑同一Quote，后者覆盖前者
- 状态变更可能被并发操作覆盖
- 数据不一致风险

**建议修复**:
```python
from django.db.models import F

class Quote(models.Model):
    version = models.IntegerField(default=1)

    def save(self, *args, **kwargs):
        if self.id:
            # 检查版本
            current = Quote.objects.get(id=self.id)
            if current.version != self.version:
                raise ConcurrentModificationError()
            self.version += 1
        super().save(*args, **kwargs)
```

**优先级**: P0 (MVP前必须修复)

---

### 21. 租户隔离缺少强制性保障 ⚠️ 新增

**位置**: 架构层面

**问题描述**:
依赖开发者手动添加`tenant_id`过滤不可靠。一旦有人写`Customer.objects.all()`就会发生严重的数据泄露。

**影响**:
- 严重的数据安全风险
- 多租户数据泄露
- 违反数据隔离原则

**建议修复**:
```python
# 方案1: Custom Manager强制过滤
class TenantAwareManager(models.Manager):
    def get_queryset(self):
        from .context import get_current_tenant_id
        queryset = super().get_queryset()
        tenant_id = get_current_tenant_id()
        if tenant_id:
            return queryset.filter(tenant_id=tenant_id)
        return queryset

# 方案2: PostgreSQL RLS (Row Level Security)
CREATE POLICY tenant_isolation_policy
ON customer
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

**优先级**: P0 (数据安全红线)

---

### 22. 飞书集成缺少限流控制 ⚠️ 新增

**位置**: `核心功能技术方案.md` - 第4节 飞书深度集成

**问题描述**:
飞书API有严格频率限制（50次/秒），多租户并发同步极易触发限流导致任务失败。

**影响**:
- API调用失败
- 同步任务中断
- 用户体验差

**建议修复**:
```python
from redis import Redis
import time

class FeishuRateLimiter:
    def __init__(self, redis_client, max_requests=50, window=1):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window = window

    def acquire(self):
        key = 'feishu:rate_limit'
        current = self.redis.incr(key)
        if current == 1:
            self.redis.expire(key, self.window)
        if current > self.max_requests:
            time.sleep(self.window)
            return self.acquire()
        return True

# 在Celery任务中使用
rate_limiter = FeishuRateLimiter(redis_client)

@shared_task
def sync_feishu_data(tenant_id):
    rate_limiter.acquire()
    # 调用飞书API
```

**优先级**: P0 (系统稳定性)

---

## 中等问题 (严重性: 中等 | 优先级: P1)

### 6. 缺少状态机验证

**位置**: `核心功能技术方案.md` - 第9节 商机阶段管理

**问题描述**:
Opportunity stage变更仅靠业务代码逻辑，缺少数据库层约束：
```python
class Opportunity(models.Model):
    stage = models.CharField(choices=OpportunityStage.CHOICES)  # 无状态转换验证
```

**影响**:
- 可能非法跳转阶段（如从"赢单"变回"初步接触"）
- 业务逻辑分散，难以维护
- 并发修改可能导致状态不一致

**建议修复**:
使用 `django-fsm`:
```python
from django_fsm import FSMIntegerField, transition

class Opportunity(models.Model):
    stage = FSMIntegerField(choices=OpportunityStage.CHOICES, default=OpportunityStage.INITIAL)

    @transition(field=stage, source=[OpportunityStage.INITIAL, OpportunityStage.QUALIFIED], target=OpportunityStage.PROPOSAL)
    def submit_proposal(self):
        # 业务逻辑
        pass
```

**优先级**: P1 (推荐使用)

---

### 7. 字段命名不一致

**位置**: `核心功能技术方案.md` - 多处

**问题描述**:
租户ID字段命名不统一：
- 有的表使用 `tenant_id` (推荐)
- 有的表使用 `account_id` (不一致)

**影响**:
- 代码可读性差
- 容易出错（写错字段名）
- 难以全局搜索替换

**建议修复**:
统一使用 `tenant_id`:
```python
# 错误示例
class Customer(models.Model):
    account_id = models.ForeignKey('Tenant')  # ❌

# 正确示例
class Customer(models.Model):
    tenant = models.ForeignKey('Tenant')  # ✅
```

**优先级**: P1 (尽早修复)

---

### 8. 缺少枚举值管理

**位置**: `核心功能技术方案.md` - 第9节 商机阶段管理

**问题描述**:
硬编码的CHOICES定义，不支持动态调整：
```python
class OpportunityStage(models.TextChoices):
    INITIAL = 'initial', '初步接触'
    QUALIFIED = 'qualified', '已确认'
    # 无法动态增删
```

**影响**:
- 每次修改阶段需要代码发布
- 不同租户无法自定义阶段
- 缺少版本控制

**建议修复**:
数据库驱动的枚举表:
```python
class OpportunityStageConfig(models.Model):
    tenant = models.ForeignKey('Tenant', on_delete=models.CASCADE)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [['tenant', 'code']]
        ordering = ['order']
```

**优先级**: P1 (取决于需求)

---

### 9. 缺少字段级权限检查

**位置**: `核心功能技术方案.md` - 第2节 权限系统 - 技术方案

**问题描述**:
文档仅描述了对象级权限，未覆盖字段级权限：
- 销售经理能否修改"预计金额"字段？
- 普通员工能否查看"手机号"字段？

**影响**:
- 无法满足细粒度权限控制
- 可能暴露敏感信息
- 合规风险（如GDPR的PII保护）

**建议修复**:
```python
class FieldPermissionPolicy(BasePermission):
    def has_permission(self, request, view):
        if view.action in ['update', 'partial_update']:
            fields = request.data.keys()
            required_perms = [f'change_{model}.{field}' for field in fields]
            return all(request.user.has_perm(p) for p in required_perms)
        return True

# DRF Serializer中过滤字段
class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', ...]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and not request.user.has_perm('view_customer_phone'):
            self.fields.pop('phone', None)
```

**优先级**: P1 (根据业务需求)

---

## 轻微问题 (严重性: 轻微 | 优先级: P2)

### 11. 缺少数据验证

**位置**: `核心功能技术方案.md` - 第6节 CPQ模块

**问题描述**:
Quote缺少金额校验：
```python
class Quote(models.Model):
    total_amount = models.DecimalField(...)  # 无校验逻辑
    discount = models.DecimalField(...)
    # 应该验证 total_amount = sum(line_items) * (1 - discount)
```

**影响**:
- 数据不一致（折扣后金额计算错误）
- 财务对账困难
- 用户可能输入错误数据

**建议修复**:
在Model的clean()方法中添加验证:
```python
from django.core.exceptions import ValidationError

class Quote(models.Model):
    def clean(self):
        calculated_total = sum(li.amount for li in self.line_items.all())
        discounted_total = calculated_total * (1 - self.discount / 100)
        if abs(self.total_amount - discounted_total) > 0.01:
            raise ValidationError({
                'total_amount': '金额与折扣后计算结果不符'
            })
```

**优先级**: P2

---

### 12. 缺少数据迁移策略

**位置**: `核心功能技术方案.md` - 第10节 多租户隔离

**问题描述**:
从单租户迁移到多租户架构时，未说明数据迁移方案：
- 现有数据如何分配tenant_id？
- 历史数据的owner_id如何处理？

**影响**:
- 迁移风险高
- 可能丢失历史数据
- 影响业务连续性

**建议修复**:
编写Django migration:
```python
def migrate_to_multi_tenant(apps, schema_editor):
    Tenant = apps.get_model('core', 'Tenant')
    User = apps.get_model('core', 'User')
    Customer = apps.get_model('core', 'Customer')

    # 创建默认租户
    default_tenant = Tenant.objects.create(name='Default')

    # 为现有用户分配租户
    User.objects.filter(tenant_id__isnull=True).update(tenant_id=default_tenant.id)

    # 为现有客户分配租户
    Customer.objects.filter(tenant_id__isnull=True).update(tenant_id=default_tenant.id)

class Migration(migrations.Migration):
    dependencies = [...]
    operations = [
        migrations.RunPython(migrate_to_multi_tenant),
    ]
```

**优先级**: P2 (需要时再补充)

---

### 13. 缺少监控和告警

**位置**: `核心功能技术方案.md` - 第3节 LTV计算引擎、第4节 飞书深度集成

**问题描述**:
异步任务、外部API调用未定义监控指标：
- LTV计算任务失败率
- 飞书API调用耗时
- Celery队列积压情况

**影响**:
- 问题发现滞后
- 难以定位性能瓶颈
- 用户体验受影响

**建议修复**:
使用Prometheus + Grafana:
```python
from prometheus_client import Counter, Histogram

ltv_calc_counter = Counter('ltv_calculation_total', 'LTV calculation count', ['status'])
ltv_calc_duration = Histogram('ltv_calculation_duration_seconds', 'LTV calculation duration')

@shared_task
def calculate_ltv(customer_id):
    start_time = time.time()
    try:
        # 计算逻辑
        ltv_calc_counter.labels(status='success').inc()
    except Exception as e:
        ltv_calc_counter.labels(status='error').inc()
        raise
    finally:
        ltv_calc_duration.observe(time.time() - start_time)
```

**优先级**: P2 (运维阶段补充)

---

### 14. 缺少日志规范

**位置**: `核心功能技术方案.md` - 全文

**问题描述**:
代码中未定义日志级别、格式、上下文信息：
- 缺少tenant_id、user_id日志上下文
- 未区分业务日志和技术日志

**影响**:
- 日志难以检索和分析
- 排查问题时缺少上下文
- 审计追踪困难

**建议修复**:
```python
import logging

logger = logging.getLogger(__name__)

class TenantLogFilter(logging.Filter):
    def filter(self, record):
        from .context import get_current_tenant_id
        record.tenant_id = get_current_tenant_id()
        return True

logger.addFilter(TenantLogFilter())

# 使用
logger.info(f"Opportunity created: {opportunity.id}", extra={'user_id': request.user.id})
```

**优先级**: P2

---

## 架构一致性问题

### 15. 集成策略不一致

**位置**: `核心功能技术方案.md` vs `待沟通事项.md`

**问题描述**:
- `待沟通事项.md` 中提出需要研究"集成策略"
- `核心功能技术方案.md` 中已有方案，但未明确统一集成框架

**影响**:
- 多个外部系统（飞书、企查查、天眼查）集成方式不一致
- 难以扩展新的集成
- 重复代码

**建议修复**:
定义统一集成层:
```python
class BaseIntegrationConnector:
    def __init__(self, config):
        self.config = config
        self.client = self._init_client()

    def _init_client(self):
        raise NotImplementedError

    def sync_data(self, last_sync_time):
        raise NotImplementedError

class FeishuConnector(BaseIntegrationConnector):
    def _init_client(self):
        return FeishuClient(self.config['app_id'], self.config['app_secret'])

    def sync_data(self, last_sync_time):
        # 实现飞书同步逻辑
        pass
```

**优先级**: P1

---

### 16. LTV计算策略未明确

**位置**: `核心功能技术方案.md` - 第3节 vs `技术决策-最终方案.md` - 第3节

**问题描述**:
- `技术决策-最终方案.md` 中LTV采用"双轨输出"（score + amount）
- `核心功能技术方案.md` 中未体现此决策，数据模型不够清晰

**影响**:
- 实现时可能遗漏amount字段
- 业务逻辑与设计不一致

**建议修复**:
在`核心功能技术方案.md`中补充:
```python
class CustomerLTV(models.Model):
    profile = models.OneToOneField('CustomerLTVProfile', ...)
    ltv_score = models.FloatField(help_text='RFM评分，0-100')  # 补充
    ltv_amount = models.DecimalField(max_digits=15, decimal_places=2, help_text='历史总金额')  # 补充
    score_version = models.CharField(max_length=20)  # 补充: 算法版本
    calculated_at = models.DateTimeField(auto_now=True)
```

**优先级**: P1

---

## 可行性和性能问题

### 17. 全量同步性能风险

**位置**: `核心功能技术方案.md` - 第4节 飞书深度集成 - 组织架构增量同步

**问题描述**:
首次同步可能需要拉取飞书全量数据（假设10万用户），未明确分批处理策略

**影响**:
- 可能超时
- 内存溢出
- 用户体验差

**建议修复**:
```python
def sync_feishu_users_batch(batch_size=100):
    cursor = None
    while True:
        response = feishu_api.get_users(page_size=batch_size, page_token=cursor)
        users = response['data']['users']
        process_users(users)  # 批量处理
        cursor = response.get('page_token')
        if not cursor:
            break
```

**优先级**: P0

---

### 18. 模糊查重性能问题

**位置**: `核心功能技术方案.md` - 第12节 客户合并与模糊查重

**问题描述**:
使用`similarity`函数或模糊匹配在大量数据时性能极差（O(n²)复杂度）

**影响**:
- 数据量>10万后查询超时
- 无法实时查重

**建议修复**:
```python
# 方案1: 使用pg_trgm索引
CREATE INDEX idx_customer_name_trgm ON customer USING gin (name gin_trgm_ops);

# 方案2: 异步后台计算相似度
class DeduplicationTask(models.Model):
    status = models.CharField(choices=['pending', 'processing', 'completed'])
    results = models.JSONField()  # 存储相似度结果

@shared_task
def find_duplicate_candidates(tenant_id):
    # 使用pg_trgm快速筛选候选
    candidates = Customer.objects.annotate(
        similarity=TrigramSimilarity('name', F('name'))
    ).filter(similarity__gt=0.7)
    # 后续精确计算相似度
```

**优先级**: P1

---

## 安全问题

### 19. 缺少敏感数据加密

**位置**: `核心功能技术方案.md` - 全文

**问题描述**:
Customer的phone、email等敏感信息未加密存储

**影响**:
- 数据库泄漏时敏感信息暴露
- 可能违反GDPR等合规要求

**建议修复**:
```python
from django_cryptography.fields import encrypt

class Customer(models.Model):
    phone = encrypt(models.CharField(max_length=20))  # 加密存储
    email = encrypt(models.EmailField())
```

**优先级**: P1 (取决于合规要求)

---

### 20. 缺少SQL注入防护说明

**位置**: `核心功能技术方案.md` - 全文

**问题描述**:
未明确说明SQL查询时需使用ORM或参数化查询

**影响**:
- 开发者可能直接拼接SQL
- 安全漏洞风险

**建议修复**:
在开发规范中添加:
```markdown
### 安全规范
- 禁止使用 raw() 执行用户输入
- 禁止字符串拼接SQL
- 必须使用ORM QuerySet或参数化查询
```

**优先级**: P2 (在开发规范中补充)

---

## 优先级汇总

| 优先级 | 问题数 | 问题ID |
|--------|--------|--------|
| P0 (严重) | 10 | 1✅, 2✅, 3✅, 4, 5, 10, 21, 22, 17✅ |
| P1 (中等) | 7 | 6, 7, 8, 9, 15, 16, 18 |
| P2 (轻微) | 6 | 11, 12, 13, 14, 19, 20 |

**说明**：
- ✅ 表示已修复
- 问题4、5、10从P1提升为P0（基于Gemini评审建议）
- 问题21、22为新发现的P0问题

---

## 建议修复顺序

### 第一阶段 (MVP前必须修复) - P0问题
1. ✅ 问题1: OneToOneField关系方向错误
2. ✅ 问题2: 缺少核心表索引
3. ✅ 问题3: Tenant上下文在后台任务中丢失
4. ✅ 问题17: 全量同步性能风险
5. ⏳ 问题4: 缺少审计字段 (从P1提升)
6. ⏳ 问题5: 缺少软删除支持 (从P1提升)
7. ⏳ 问题10: 缺少并发控制 (从P1提升)
8. ⏳ 问题21: 租户隔离缺少强制性保障 (新增)
9. ⏳ 问题22: 飞书集成缺少限流控制 (新增)

### 第二阶段 (MVP阶段修复) - P1问题
10. 问题6: 缺少状态机验证
11. 问题7: 字段命名不一致
12. 问题8: 缺少枚举值管理
13. 问题9: 缺少字段级权限检查
14. 问题15: 集成策略不一致
15. 问题16: LTV计算策略未明确
16. 问题18: 模糊查重性能问题

### 第三阶段 (优化阶段) - P2问题
17. 问题11: 缺少数据验证
18. 问题12: 缺少数据迁移策略
19. 问题13: 缺少监控和告警
20. 问题14: 缺少日志规范
21. 问题19: 缺少敏感数据加密
22. 问题20: 缺少SQL注入防护说明

---

## 后续行动

1. [ ] 创建修复任务清单，分配责任人
2. [ ] 更新`核心功能技术方案.md`，修复上述问题
3. [ ] 补充代码示例和数据模型
4. [ ] 编写开发规范文档
5. [ ] 建立代码Review检查清单
