# Django Models Implementation Guide - Pury CRM

This document provides detailed specifications for implementing all Django models according to the design document.

---

## Implementation Order

1. **accounts/models.py**: Account, User
2. **customers/models.py**: Customer, Contact, Lead, CustomerLTVProfile, CustomerLTV, LTVHistory, CustomerPool, PoolCustomer
3. **opportunities/models.py**: Opportunity
4. **core/models.py**: Activity, StageHistory

---

## 1. Account Model (accounts/models.py)

```python
import uuid
from django.db import models

class Account(models.Model):
    """Multi-tenant account/organization"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name='企业名称')
    feishu_tenant_key = models.CharField(max_length=100, unique=True, verbose_name='飞书租户Key')
    is_active = models.BooleanField(default=True, verbose_name='是否激活')
    settings = models.JSONField(default=dict, verbose_name='企业配置')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'accounts_account'
        verbose_name = '企业账号'
        verbose_name_plural = '企业账号'
        indexes = [
            models.Index(fields=['feishu_tenant_key']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name
```

---

## 2. User Model (accounts/models.py)

```python
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """Custom user model with Feishu integration"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='users')

    # Feishu fields
    feishu_open_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    feishu_union_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    feishu_user_id = models.CharField(max_length=100, unique=True, null=True, blank=True)

    # User info
    display_name = models.CharField(max_length=100, verbose_name='显示名称')
    avatar_url = models.URLField(null=True, blank=True, verbose_name='头像URL')
    mobile = models.CharField(max_length=20, null=True, blank=True, verbose_name='手机号')

    # Organization info
    department_id = models.CharField(max_length=100, null=True, blank=True)
    department_name = models.CharField(max_length=200, null=True, blank=True)
    job_title = models.CharField(max_length=100, null=True, blank=True, verbose_name='职位')
    feishu_team_id = models.CharField(max_length=100, null=True, blank=True)

    # Team hierarchy
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='team_members', verbose_name='上级经理')

    # Role
    ROLE_CHOICES = [
        ('admin', '系统管理员'),
        ('sales_manager', '销售经理'),
        ('sales', '销售人员'),
        ('presales', '售前支持'),
        ('aftersales', '售后支持'),
        ('viewer', '只读用户'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='sales')

    # Status
    last_sync_at = models.DateTimeField(null=True, blank=True, verbose_name='最后同步时间')

    class Meta:
        db_table = 'accounts_user'
        verbose_name = '用户'
        verbose_name_plural = '用户'
        indexes = [
            models.Index(fields=['account', 'is_active']),
            models.Index(fields=['feishu_open_id']),
            models.Index(fields=['role']),
            models.Index(fields=['manager']),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.username})"
```

**Important Notes for User Model**:
- Must update `AUTH_USER_MODEL = 'accounts.User'` in settings.py BEFORE first migration
- Username field inherited from AbstractUser
- Email field inherited from AbstractUser

---

## 3. Customer Model (customers/models.py)

This is the largest and most complex model. Key sections:

### Basic Structure
```python
class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE)

    # Basic info
    name = models.CharField(max_length=200, verbose_name='客户名称')
    short_name = models.CharField(max_length=100, null=True, blank=True)
    unified_social_credit_code = models.CharField(max_length=50, null=True, blank=True,
                                                   verbose_name='统一社会信用代码')
```

### Classification Fields
```python
    TYPE_CHOICES = [
        ('enterprise', '企业客户'),
        ('government', '政府机构'),
        ('institution', '事业单位'),
        ('other', '其他'),
    ]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    TIER_CHOICES = [
        ('strategic', '战略客户'),
        ('key', '重点客户'),
        ('standard', '标准客户'),
        ('potential', '潜在客户'),
    ]
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)

    industry = models.CharField(max_length=100, null=True, blank=True)
```

### Geographic & Scale
```python
    province = models.CharField(max_length=50, null=True, blank=True)
    city = models.CharField(max_length=50, null=True, blank=True)
    district = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)

    employee_count = models.IntegerField(null=True, blank=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
```

### Business & Ownership
```python
    SOURCE_CHOICES = [
        ('referral', '客户转介绍'),
        ('partner', '合作伙伴'),
        ('exhibition', '展会'),
        ('website', '官网'),
        ('cold_call', '陌生拜访'),
        ('other', '其他'),
    ]
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, null=True, blank=True)

    owner = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True,
                              related_name='owned_customers')
    team_members = models.ManyToManyField('accounts.User', related_name='team_customers', blank=True)
```

### Customer Pool
```python
    current_pool = models.ForeignKey('CustomerPool', on_delete=models.SET_NULL,
                                     null=True, blank=True)
    pool_entered_at = models.DateTimeField(null=True, blank=True)
```

### Status & Scoring
```python
    STATUS_CHOICES = [
        ('lead', '线索'),
        ('qualified', '已确认'),
        ('negotiating', '谈判中'),
        ('customer', '成交客户'),
        ('inactive', '休眠'),
        ('lost', '已流失'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    health_score = models.IntegerField(default=0)
    potential_score = models.IntegerField(default=0)
    engagement_score = models.IntegerField(default=0)
```

### LTV Cache Fields
```python
    ltv_score = models.IntegerField(default=0)
    LTV_TIER_CHOICES = [
        ('platinum', '白金客户'),
        ('gold', '黄金客户'),
        ('silver', '白银客户'),
        ('bronze', '青铜客户'),
    ]
    ltv_tier = models.CharField(max_length=20, choices=LTV_TIER_CHOICES, default='bronze')
    ltv_calculated_at = models.DateTimeField(null=True, blank=True)
```

### Important Dates
```python
    first_contact_date = models.DateField(null=True, blank=True)
    last_contact_date = models.DateField(null=True, blank=True)
    next_action_date = models.DateField(null=True, blank=True)
```

### Tags & Notes
```python
    tags = models.JSONField(default=list)
    description = models.TextField(null=True, blank=True)
    internal_notes = models.TextField(null=True, blank=True)
```

### Soft Delete
```python
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                   null=True, related_name='deleted_customers')
```

### Audit Fields
```python
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                   null=True, related_name='created_customers')
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                   null=True, related_name='updated_customers')
```

### Meta & Indexes
```python
    class Meta:
        db_table = 'customers_customer'
        verbose_name = '客户'
        verbose_name_plural = '客户'
        indexes = [
            models.Index(fields=['account', 'is_deleted']),
            models.Index(fields=['account', 'name']),
            models.Index(fields=['type', 'status']),
            models.Index(fields=['industry']),
            models.Index(fields=['tier']),
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['next_action_date']),
            models.Index(fields=['health_score']),
            models.Index(fields=['ltv_score']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['account', 'name'],
                name='unique_customer_name_per_account'
            ),
        ]
```

---

## Next Models Summary

Due to length constraints, here are the remaining models to implement:

4. **Contact** - Customer contacts with role types
5. **Lead** - Lead management with conversion tracking
6. **Opportunity** - Sales pipeline with stage management
7. **Activity** - Interaction tracking
8. **StageHistory** - Opportunity stage changes
9. **CustomerLTVProfile** - LTV input features
10. **CustomerLTV** - LTV calculation results
11. **LTVHistory** - LTV change tracking
12. **CustomerPool** - Customer pool management
13. **PoolCustomer** - Pool membership tracking

Each model follows similar patterns with:
- UUID primary keys
- Proper foreign keys and relationships
- Comprehensive indexes
- Audit fields where appropriate
- Verbose names in Chinese

---

## Implementation Checklist

- [ ] Create all model classes
- [ ] Add proper imports (uuid, models, etc.)
- [ ] Set db_table for each model
- [ ] Add verbose_name and verbose_name_plural
- [ ] Define all indexes in Meta
- [ ] Add constraints where needed
- [ ] Implement __str__ methods
- [ ] Run makemigrations
- [ ] Review migration files
- [ ] Run migrate

---

**File**: `.claude/plans/models_implementation_guide.md`
**Last Updated**: 2026-01-26
