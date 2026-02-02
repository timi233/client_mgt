# CRM Design Review
**Reviewer:** OpenCode
**Date:** 2026-01-23

## Backend Architecture & Data Model

### 10 Core Models: Reasonable
- Models 1-8 (Account, User, Customer, Contact, Lead, Opportunity, Activity, StageHistory) provide solid CRM foundation
- Models 9-10 (CustomerLTV, LTVHistory) add sophisticated value tracking capability
- Good separation of concerns with proper foreign key relationships

### CustomerPool/PoolCustomer Design: Issues
1. Missing from main design doc - only exists in plan file (needs consolidation)
2. PoolCustomer `unique_together=['pool', 'customer']` prevents customers in multiple pools - this may be intentional but limits flexibility
3. No `current_pool` field on Customer - requires joining PoolCustomer to determine status, adds query complexity
4. PoolCustomer lacks `owner` field - unclear who "owns" pool customer for permission checks (needed for "本团队" access)
5. Missing protection tracking: no field to track when protection expires for claimed customers

### tracking_id for Lead-Opportunity Chain: Good
- UUID approach provides reliable chain tracking
- `source_tracking_id` on Opportunity enables conversion analysis
- Suggest adding `converted_from_lead` FK directly to Opportunity for explicit relationship (in addition to tracking_id)

### DB Indexes: Gaps
Missing critical indexes:
```python
# Customer
Index(fields=['account', 'name'])  # Customer name search
Index(fields=['type', 'status'])  # Filtering
Index(fields=['industry'])  # Dashboard grouping

# Opportunity
Index(fields=['amount'])  # Pipeline value sorting
Index(fields=['stage', 'probability'])  # Stage analysis
Index(fields=['product_line'])  # Product analysis

# Activity
Index(fields=['type'])  # Activity type filtering
```

### LTV Calculation: Concerns
1. Formula confusion: "LTV总分 = 潜力评分(0-100) + 实际价值(金额)" - mixing score and currency doesn't make sense
2. Later in doc contradicts: "LTV最终结果为评分（0-100分），不是货币金额"
3. **Recommendation**: Clarify final output - either pure score (0-100) OR currency value with score for tiering

## Permissions

### 6-Role Matrix: Mostly Complete, Gaps

| Issue | Detail |
|-------|--------|
| Team boundary unclear | No explicit User.team field - only department_id. "本团队" access needs team definition |
| Manager scope | Can't determine team without Team model or team_id on User |
| Export permissions | No CSV export permissions defined |
| Dashboard access | No role-based dashboard data scope defined |
| Field-level editing | Presales "部分字段" needs explicit field list |

### Sensitive Field Access: Good but needs refinement
- Current design: "仅对记录直接关联的角色开放"
- **Gap**: Contact mobile/phone visible to team members AND manager AND owner - but no hierarchy for which manager owns which users
- **Gap**: Channel commission fields not in design models despite being listed as sensitive

### Sales Manager Team Scope: Critical Gap
Current User model has:
- `department_id` / `department_name` (from Feishu)
- No `team_id` or `managed_by` field

**Required additions:**
```python
class User(AbstractUser):
    # Add for team hierarchy
    manager = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='team_members')
    team_id = CharField(max_length=100, null=True)  # Feishu team ID
```

## Summary

### Critical Issues:
1. Team hierarchy missing - sales managers can't determine their team
2. CustomerPool design incomplete - missing current_pool reference, owner, protection tracking
3. LTV calculation formula contradictory
4. Key database indexes missing for performance

### Recommendations:
1. Add User.manager + team_id fields
2. Add Customer.current_pool + PoolCustomer.owner + PoolCustomer.protection_until
3. Clarify LTV: output score (0-100) only
4. Add missing indexes (above list)
5. Add Opportunity.converted_from_lead FK (keep tracking_id for cross-entity analysis)
6. Define explicit presales editable fields
