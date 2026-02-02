# Pury CRM

B2B CRM系统 - Django + PostgreSQL + DRF + 飞书集成

## 技术栈

- Django 6.0
- Django REST Framework
- PostgreSQL
- Celery + Redis
- 飞书开放平台

## 安装步骤

1. 创建虚拟环境
```bash
python3 -m venv Pury_CRM
source Pury_CRM/bin/activate
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，填入实际配置
```

4. 数据库迁移
```bash
python manage.py migrate
```

5. 创建超级用户
```bash
python manage.py createsuperuser
```

6. 运行开发服务器
```bash
python manage.py runserver
```

## 项目结构

- `core/` - 核心应用（基础模型）
- `accounts/` - 账户应用（用户、租户）
- `customers/` - 客户应用
- `opportunities/` - 商机应用

## 文档

技术方案文档位于 `.claude/plans/` 目录。
