# Master Implementation Plan - Pury CRM

## 1. Project Overview

- Summary of the Pury CRM system: B2B CRM with Django + PostgreSQL + DRF + Feishu integration.

## 2. Current State Assessment

- Django 6.0 project scaffolded with apps: accounts, core, customers, opportunities, crm_backend
- Virtual environment set up with Django 6.0.1, DRF 3.16.1, Celery 5.6.2, psycopg2-binary 2.9.11
- No models implemented yet (empty models.py files)
- Basic settings.py exists but needs configuration for apps, database, DRF, Celery
- .env.example exists but no actual .env file

## 3. Implementation Phases (12 weeks total)

### Phase 1: Backend Foundation (Week 1-2)

- Configure Django settings (database, installed apps, DRF, Celery)
- Implement core data models:
  - Account (multi-tenant support)
  - User (custom user model with Feishu fields)
  - Customer (core entity with LTV fields)
  - Contact (customer contacts)
  - Lead (lead management)
  - Opportunity (sales pipeline)
  - Activity (interaction tracking)
  - StageHistory (opportunity stage tracking)
  - CustomerLTVProfile (LTV input features)
  - CustomerLTV (LTV calculation results)
  - LTVHistory (LTV change tracking)
  - CustomerPool & PoolCustomer (customer pool management)
- Create database migrations
- Set up PostgreSQL database

### Phase 2: Core API Development (Week 3-4)

- Implement DRF serializers for all models
- Create ViewSets and API endpoints
- Implement authentication & permissions
- LTV calculation service implementation
- Celery tasks for LTV calculation
- Basic CRUD operations testing

### Phase 3: Feishu Integration (Week 5-6)

- Feishu OAuth authentication
- User synchronization from Feishu
- Organization structure sync
- Webhook handlers for real-time updates

### Phase 4: System Integrations (Week 7-10)

- Integration framework setup (API + Message Queue)
- Channel system integration (ChannelPartner, CustomerChannelRelation models)
- Work order system integration (WorkOrder model)
- Order system preparation (Order model - reserved for future)
- Integration logging and monitoring

### Phase 5: Advanced Features (Week 11-12)

- Customer pool management logic
- Automated LTV recalculation (Celery Beat)
- Smart alerts and notifications
- Data export/import functionality
- Performance optimization

## 4. Critical Dependencies

- PostgreSQL database setup
- Redis for Celery
- Feishu app credentials (for OAuth)
- External system API endpoints (Channel, WorkOrder systems)

## 5. Blocking Issues to Track

- Feishu app registration and credentials
- External system API specifications
- Database server access and credentials
- Production deployment infrastructure

## 6. Success Criteria

- All models implemented and migrated
- Complete REST API with authentication
- Feishu login working
- LTV calculation functional
- Basic integration framework ready
