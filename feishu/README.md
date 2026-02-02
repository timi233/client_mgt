# 飞书集成文档

## 1. 概述

### 1.1 功能简介

飞书集成模块提供企业与飞书平台的深度集成能力，支持以下核心功能：

- **OAuth 单点登录**：通过飞书账号快速登录系统
- **用户信息同步**：实时同步飞书用户、组织架构到本地数据库
- **事件订阅**：通过 WebSocket 长连接实时接收飞书事件推送
- **消息发送**：通过 API 向飞书用户发送通知消息
- **自动化工作流**：基于飞书事件触发业务流程

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        CRM 系统                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   OAuth层    │  │   业务层     │  │  WebSocket   │    │
│  │  (登录认证)   │  │  (用户同步)   │  │   (事件监听)  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │              │
│  ┌──────▼─────────────────▼─────────────────▼───────┐    │
│  │              FeishuAPI (API客户端)               │    │
│  └──────────────────────────┬──────────────────────┘    │
└─────────────────────────────┼──────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │    飞书开放平台      │
                   │  (Open API / Webhook)│
                   └──────────────────────┘
```

**核心组件：**

- `FeishuAPIClient` - 飞书 API 客户端，封装所有 API 调用
- `FeishuUserSyncService` - 用户同步服务，处理数据同步逻辑
- `FeishuEventHandler` - 事件处理器，处理飞书推送的事件
- `FeishuWebSocketClient` - WebSocket 长连接客户端，实时接收事件
- Django Views - OAuth 登录和 Webhook 接口

## 2. 配置指南

### 2.1 飞书应用配置

#### 步骤 1：创建企业自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录并进入"开发者后台"
3. 点击"创建企业自建应用"
4. 填写应用名称和描述
5. 创建成功后获取 **App ID** 和 **App Secret**

#### 步骤 2：配置权限范围

在飞书开放平台应用管理页面，配置以下权限：

**必需权限：**

| 权限名称 | 权限标识 | 说明 |
|---------|---------|------|
| 获取用户基本信息 | `contact:user.base:readonly` | 读取用户姓名、邮箱等基本信息 |
| 获取用户详细信息 | `contact:user:readonly` | 读取用户完整信息 |
| 获取部门信息 | `contact:department:readonly` | 读取组织架构 |
| 获取用户ID | `contact:user.id:readonly` | 读取用户标识符 |
| 发送消息 | `im:message` | 向用户发送消息 |

**事件订阅权限：**

| 事件类型 | 权限说明 |
|---------|---------|
| 用户加入 | `user.add` |
| 用户更新 | `user.update` |
| 用户离职 | `user.leave` |
| 部门创建 | `department.create` |
| 部门更新 | `department.update` |

#### 步骤 3：配置回调地址

在"事件订阅"配置中设置回调地址：

```
Webhook URL: https://your-domain.com/api/v1/feishu/events/
```

**注意：** 
- URL 必须是公网可访问的 HTTPS 地址
- 域名需要在飞书开放平台白名单中配置
- 开发环境可使用内网穿透工具（如 ngrok）

### 2.2 环境变量配置

在项目根目录的 `.env` 文件中添加以下配置：

```bash
# 飞书应用配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 可选配置（事件订阅验证）
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key

# OAuth 回调地址（可选，默认自动生成）
FEISHU_REDIRECT_URI=https://your-domain.com/api/v1/feishu/callback/
```

**配置说明：**

- `FEISHU_APP_ID` - 飞书应用的 App ID
- `FEISHU_APP_SECRET` - 飞书应用的 App Secret
- `FEISHU_VERIFICATION_TOKEN` - Webhook 验证令牌（在飞书后台生成）
- `FEISHU_ENCRYPT_KEY` - 事件加密密钥（在飞书后台生成）
- `FEISHU_REDIRECT_URI` - OAuth 回调地址，不配置则自动使用当前域名

**Django 设置（crm_backend/settings.py）：**

```python
from decouple import config

FEISHU_APP_ID = config('FEISHU_APP_ID', default='')
FEISHU_APP_SECRET = config('FEISHU_APP_SECRET', default='')
FEISHU_VERIFICATION_TOKEN = config('FEISHU_VERIFICATION_TOKEN', default='')
FEISHU_ENCRYPT_KEY = config('FEISHU_ENCRYPT_KEY', default='')
FEISHU_REDIRECT_URI = config('FEISHU_REDIRECT_URI', default=None)
```

## 3. OAuth 登录流程

### 3.1 登录接口说明

#### 3.1.1 发起登录

**接口：** `GET /api/v1/feishu/login/`

**功能：** 重定向到飞书 OAuth 授权页面

**参数：** 无

**返回：** 302 重定向到飞书授权页面

**示例：**

```bash
curl -X GET https://your-domain.com/api/v1/feishu/login/
```

#### 3.1.2 回调处理

**接口：** `GET /api/v1/feishu/callback/`

**功能：** 处理飞书 OAuth 回调，返回 JWT 令牌

**参数：**
- `code` (必需) - 飞书授权码

**返回：**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "user@example.com",
    "display_name": "张三",
    "email": "user@example.com",
    "avatar_url": "https://example.com/avatar.jpg",
    "role": "sales"
  }
}
```

**错误响应：**

```json
{
  "error": "Missing authorization code"
}
```

#### 3.1.3 登出

**接口：** `POST /api/v1/feishu/logout/`

**功能：** 用户登出

**参数：** 无

**返回：**

```json
{
  "message": "Logged out successfully"
}
```

### 3.2 回调处理流程

```
1. 用户点击"飞书登录"
        ↓
2. 系统重定向到飞书授权页面
        ↓
3. 用户在飞书页面确认授权
        ↓
4. 飞书重定向回系统并携带授权码（code）
        ↓
5. 系统使用授权码换取访问令牌
        ↓
6. 系统使用访问令牌获取用户信息
        ↓
7. 系统根据用户信息创建/更新本地用户
        ↓
8. 系统生成 JWT 令牌返回给前端
```

### 3.3 JWT 令牌

令牌类型：使用 Django REST Framework SimpleJWT

**访问令牌（Access Token）：**
- 用途：认证 API 请求
- 有效期：默认 15 分钟
- 使用方式：在请求头中添加 `Authorization: Bearer <access_token>`

**刷新令牌（Refresh Token）：**
- 用途：获取新的访问令牌
- 有效期：默认 7 天
- 使用方式：调用 `/api/v1/token/refresh/` 刷新令牌

**示例请求：**

```bash
curl -X GET https://your-domain.com/api/v1/customers/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 4. 用户同步

### 4.1 同步机制

#### 4.1.1 两种同步方式

**方式一：手动同步**

通过 Django 管理命令或 API 手动触发同步。

**方式二：事件驱动同步**

通过 WebSocket 长连接实时接收飞书事件，自动触发同步。

#### 4.1.2 同步流程

```
1. 从飞书 API 获取用户列表（支持分页）
        ↓
2. 遍历用户数据
        ↓
3. 根据 user_id 或 open_id 查找本地用户
        ↓
4. 存在则更新，不存在则创建
        ↓
5. 更新 last_sync_at 时间戳
        ↓
6. 记录同步日志
```

### 4.2 字段映射

| 飞书字段 | 本地字段 | 说明 |
|---------|---------|------|
| `user_id` | `feishu_user_id` | 飞书用户 ID |
| `open_id` | `feishu_open_id` | 飞书开放 ID |
| `union_id` | `feishu_union_id` | 飞书联合 ID |
| `name` | `display_name` | 用户姓名 |
| `email` | `email` | 邮箱地址 |
| `mobile` | `mobile` | 手机号码 |
| `avatar` | `avatar_url` | 头像 URL |
| `department_ids` | `department_id` | 部门 ID（取第一个） |
| `job_title` | `job_title` | 职位名称 |
| `is_active` | `is_active` | 激活状态 |

### 4.3 使用示例

#### 4.3.1 同步单个用户

```python
from feishu.services import FeishuUserSyncService

sync_service = FeishuUserSyncService()

user_data = {
    'user_id': 'ou_xxxxx',
    'open_id': 'ou_xxxxx',
    'union_id': 'on_xxxxx',
    'name': '张三',
    'email': 'zhangsan@example.com',
    'mobile': '13800138000',
    'department_ids': ['od_xxxxx'],
    'job_title': '销售经理'
}

user = sync_service.sync_user_from_feishu(user_data, account=account)
print(f"同步用户: {user.username}")
```

#### 4.3.2 同步所有用户

```python
from feishu.services import FeishuUserSyncService

sync_service = FeishuUserSyncService()
count = sync_service.sync_all_users(account=account)
print(f"同步了 {count} 个用户")
```

#### 4.3.3 同步部门结构

```python
from feishu.services import FeishuUserSyncService

sync_service = FeishuUserSyncService()
departments = sync_service.sync_department_structure(account=account)
print(f"同步了 {len(departments)} 个部门")
```

#### 4.3.4 Django 管理命令

创建管理命令 `feishu/management/commands/sync_feishu_users.py`：

```python
from django.core.management.base import BaseCommand
from accounts.models import Account
from feishu.services import FeishuUserSyncService

class Command(BaseCommand):
    help = 'Sync users from Feishu'

    def handle(self, *args, **options):
        account = Account.objects.filter(is_active=True).first()
        if not account:
            self.stdout.write(self.style.ERROR('No active account found'))
            return

        sync_service = FeishuUserSyncService()
        
        self.stdout.write('Syncing users from Feishu...')
        count = sync_service.sync_all_users(account=account)
        self.stdout.write(self.style.SUCCESS(f'Synced {count} users'))
        
        self.stdout.write('Syncing departments...')
        departments = sync_service.sync_department_structure(account=account)
        self.stdout.write(self.style.SUCCESS(f'Synced {len(departments)} departments'))
```

**运行命令：**

```bash
python manage.py sync_feishu_users
```

## 5. WebSocket 长连接

### 5.1 启动命令

```bash
python manage.py start_feishu_ws
```

**功能：**
- 启动 WebSocket 长连接客户端
- 实时接收飞书事件推送
- 自动处理事件和错误
- 支持 Ctrl+C 优雅退出

**日志输出：**

```
2026-02-02 17:00:00 - feishu.websocket_client - INFO - Starting Feishu WebSocket client...
2026-02-02 17:00:01 - feishu.websocket_client - INFO - WebSocket connection established
2026-02-02 17:00:02 - feishu.websocket_client - INFO - Received user.add_v1 event
2026-02-02 17:00:02 - feishu.event_handler - INFO - User created/updated from Feishu: zhangsan@example.com
```

### 5.2 事件处理

#### 5.2.1 支持的事件类型

| 事件类型 | 说明 | 处理逻辑 |
|---------|------|---------|
| `user_add` | 用户加入 | 创建新用户或更新现有用户 |
| `user_update` | 用户更新 | 更新用户信息 |
| `user_leave` | 用户离职 | 停用用户账号 |
| `department_create` | 部门创建 | 添加部门到组织架构 |
| `department_update` | 部门更新 | 更新部门信息 |

#### 5.2.2 事件处理流程

```
1. WebSocket 接收到飞书事件
        ↓
2. 事件分发器根据事件类型路由到对应处理器
        ↓
3. 事件处理器验证事件签名（可选）
        ↓
4. 提取事件数据
        ↓
5. 调用同步服务处理业务逻辑
        ↓
6. 返回处理结果
        ↓
7. 记录日志
```

#### 5.2.3 事件示例

**用户加入事件：**

```json
{
  "event_type": "user_add",
  "tenant_key": "xxx",
  "event": {
    "type": "user_add",
    "user": {
      "user_id": "ou_xxxxx",
      "open_id": "ou_xxxxx",
      "name": "张三",
      "email": "zhangsan@example.com",
      "department_ids": ["od_xxxxx"]
    }
  }
}
```

**用户离职事件：**

```json
{
  "event_type": "user_leave",
  "tenant_key": "xxx",
  "event": {
    "type": "user_leave",
    "user": {
      "user_id": "ou_xxxxx",
      "open_id": "ou_xxxxx"
    }
  }
}
```

### 5.3 进程管理

#### 5.3.1 Supervisor 配置

**安装 Supervisor：**

```bash
sudo apt-get install supervisor
```

**创建配置文件 `/etc/supervisor/conf.d/feishu_ws.conf`：**

```ini
[program:feishu_ws]
command=/path/to/venv/bin/python /path/to/New-CRM/manage.py start_feishu_ws
directory=/path/to/New-CRM
user=www-data
autostart=true
autorestart=true
startsecs=10
startretries=3
stopwaitsecs=60
redirect_stderr=true
stdout_logfile=/var/log/supervisor/feishu_ws.out.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
stderr_logfile=/var/log/supervisor/feishu_ws.err.log
stderr_logfile_maxbytes=50MB
stderr_logfile_backups=10
environment=PATH="/path/to/venv/bin",DJANGO_SETTINGS_MODULE="crm_backend.settings"
```

**重载配置并启动：**

```bash
# 重载配置
sudo supervisorctl reread
sudo supervisorctl update

# 启动服务
sudo supervisorctl start feishu_ws

# 查看状态
sudo supervisorctl status feishu_ws

# 查看日志
sudo supervisorctl tail feishu_ws

# 重启服务
sudo supervisorctl restart feishu_ws
```

#### 5.3.2 Systemd 配置

**创建服务文件 `/etc/systemd/system/feishu_ws.service`：**

```ini
[Unit]
Description=Feishu WebSocket Long Connection Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/New-CRM
Environment="PATH=/path/to/venv/bin"
Environment="DJANGO_SETTINGS_MODULE=crm_backend.settings"
ExecStart=/path/to/venv/bin/python /path/to/New-CRM/manage.py start_feishu_ws
Restart=always
RestartSec=10
StandardOutput=append:/var/log/feishu_ws.out.log
StandardError=append:/var/log/feishu_ws.err.log

[Install]
WantedBy=multi-user.target
```

**启动服务：**

```bash
# 重载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start feishu_ws

# 设置开机自启
sudo systemctl enable feishu_ws

# 查看状态
sudo systemctl status feishu_ws

# 查看日志
sudo journalctl -u feishu_ws -f
```

#### 5.3.3 进程监控

**监控脚本：**

```python
import psutil
import subprocess

def check_feishu_ws():
    """检查 WebSocket 进程是否运行"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if 'start_feishu_ws' in proc.info['cmdline']:
            return True
    return False

def restart_feishu_ws():
    """重启 WebSocket 进程"""
    if check_feishu_ws():
        subprocess.run(['supervisorctl', 'restart', 'feishu_ws'])
    else:
        subprocess.run(['supervisorctl', 'start', 'feishu_ws'])

if __name__ == '__main__':
    if not check_feishu_ws():
        restart_feishu_ws()
```

**定时任务（Cron）：**

```bash
# 每 5 分钟检查一次
*/5 * * * * /usr/bin/python3 /path/to/check_feishu_ws.py
```

## 6. API 参考

### 6.1 端点列表

| 接口 | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 飞书登录 | GET | `/api/v1/feishu/login/` | 发起 OAuth 登录 |
| 飞书回调 | GET | `/api/v1/feishu/callback/` | 处理 OAuth 回调 |
| 飞书登出 | POST | `/api/v1/feishu/logout/` | 用户登出 |
| 事件 Webhook | POST | `/api/v1/feishu/events/` | 接收飞书事件推送 |

### 6.2 FeishuAPIClient API

#### 6.2.1 获取访问令牌

```python
from feishu.client import FeishuAPIClient

client = FeishuAPIClient()
token = client.get_tenant_access_token()
```

**返回：** `str` - 访问令牌

**说明：**
- 令牌有效期 7200 秒（2 小时）
- 自动缓存到 Django cache
- 缓存有效期 6900 秒（提前 5 分钟刷新）

#### 6.2.2 获取用户信息

```python
from feishu.client import FeishuAPIClient

client = FeishuAPIClient()
user_info = client.get_user_info(user_id='ou_xxxxx', user_id_type='open_id')
```

**参数：**
- `user_id` (str) - 用户 ID
- `user_id_type` (str) - ID 类型：`open_id`、`user_id`、`union_id`

**返回：**

```python
{
    'code': 0,
    'data': {
        'user': {
            'user_id': 'ou_xxxxx',
            'open_id': 'ou_xxxxx',
            'name': '张三',
            'email': 'zhangsan@example.com',
            'mobile': '13800138000',
            'department_ids': ['od_xxxxx'],
            'avatar_url': 'https://...'
        }
    }
}
```

#### 6.2.3 获取部门列表

```python
from feishu.client import FeishuAPIClient

client = FeishuAPIClient()
dept_list = client.get_department_list(
    parent_department_id='0',
    page_size=50
)
```

**参数：**
- `parent_department_id` (str) - 父部门 ID，`'0'` 表示根部门
- `page_token` (str, 可选) - 分页令牌
- `page_size` (int) - 每页数量，最大 50

**返回：**

```python
{
    'code': 0,
    'data': {
        'items': [
            {
                'department_id': 'od_xxxxx',
                'name': '技术部',
                'parent_department_id': '0'
            }
        ],
        'page_token': 'next_page_token',
        'has_more': True
    }
}
```

#### 6.2.4 获取用户列表

```python
from feishu.client import FeishuAPIClient

client = FeishuAPIClient()
user_list = client.get_user_list(
    department_id='od_xxxxx',
    page_token=None
)
```

**参数：**
- `department_id` (str, 可选) - 部门 ID
- `page_token` (str, 可选) - 分页令牌

**返回：**

```python
{
    'code': 0,
    'data': {
        'items': [
            {
                'user_id': 'ou_xxxxx',
                'open_id': 'ou_xxxxx',
                'name': '张三',
                'email': 'zhangsan@example.com'
            }
        ],
        'page_token': 'next_page_token'
    }
}
```

#### 6.2.5 发送消息

```python
from feishu.client import FeishuAPIClient

client = FeishuAPIClient()
result = client.send_message(
    receive_id='ou_xxxxx',
    msg_type='text',
    content={'text': 'Hello, World!'},
    receive_id_type='open_id'
)
```

**参数：**
- `receive_id` (str) - 接收者 ID
- `msg_type` (str) - 消息类型：`text`、`post`、`interactive`
- `content` (dict) - 消息内容
- `receive_id_type` (str, 可选) - ID 类型：`open_id`、`user_id`

**返回：**

```python
{
    'code': 0,
    'data': {
        'message_id': 'om_xxxxx'
    }
}
```

**消息类型示例：**

**文本消息：**

```python
content = {'text': 'Hello, World!'}
```

**富文本消息：**

```python
content = {
    'post': {
        'zh_cn': {
            'title': '通知',
            'content': [
                [{'tag': 'text', 'text': '这是一条富文本消息'}]
            ]
        }
    }
}
```

### 6.3 请求/响应示例

#### 6.3.1 OAuth 登录流程

**1. 发起登录：**

```bash
curl -X GET https://your-domain.com/api/v1/feishu/login/
```

**2. 飞书授权页面（用户确认后）：**

飞书重定向到：
```
https://your-domain.com/api/v1/feishu/callback/?code=xxxxxxxx
```

**3. 获取令牌：**

```bash
curl -X GET "https://your-domain.com/api/v1/feishu/callback/?code=xxxxxxxx"
```

**响应：**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan@example.com",
    "display_name": "张三",
    "email": "zhangsan@example.com",
    "avatar_url": "https://...",
    "role": "sales"
  }
}
```

#### 6.3.2 使用 JWT 访问 API

```bash
curl -X GET https://your-domain.com/api/v1/customers/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**响应：**

```json
{
  "count": 10,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "示例客户",
      "contact": "张三",
      "phone": "13800138000"
    }
  ]
}
```

#### 6.3.3 事件 Webhook

**请求：**

```bash
curl -X POST https://your-domain.com/api/v1/feishu/events/ \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "user_add",
    "tenant_key": "xxx",
    "event": {
      "type": "user_add",
      "user": {
        "user_id": "ou_xxxxx",
        "name": "张三"
      }
    }
  }'
```

**响应：**

```json
{
  "success": true,
  "action": "user_synced",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 7. 故障排查

### 7.1 常见问题

#### 7.1.1 OAuth 登录失败

**问题：** OAuth 回调时返回错误

**可能原因：**
- `FEISHU_APP_ID` 或 `FEISHU_APP_SECRET` 配置错误
- 回调地址未在飞书后台配置
- 应用权限未授予

**解决方案：**

1. 检查 `.env` 文件配置

```bash
# 查看配置
cat .env | grep FEISHU
```

2. 在飞书开放平台检查回调地址配置

3. 确认应用权限已授予

4. 查看 Django 日志

```bash
tail -f /var/log/django/django.log
```

#### 7.1.2 WebSocket 连接失败

**问题：** WebSocket 客户端无法连接

**可能原因：**
- 飞书应用未启用长连接
- 网络连接问题
- 防火墙阻止

**解决方案：**

1. 检查飞书应用长连接配置

在飞书开放平台"事件订阅"中，确认已选择"使用长连接接收事件"

2. 测试网络连接

```bash
ping open.feishu.cn
telnet open.feishu.cn 443
```

3. 检查防火墙规则

```bash
sudo ufw status
sudo ufw allow 443/tcp
```

4. 查看 WebSocket 日志

```bash
tail -f /var/log/supervisor/feishu_ws.out.log
tail -f /var/log/supervisor/feishu_ws.err.log
```

#### 7.1.3 用户同步失败

**问题：** 用户数据未同步到本地数据库

**可能原因：**
- 用户 ID 不匹配
- 数据库连接问题
- 权限不足

**解决方案：**

1. 手动测试同步

```python
from feishu.services import FeishuUserSyncService
from accounts.models import Account

sync_service = FeishuUserSyncService()
account = Account.objects.first()

# 测试单个用户同步
user_data = {'user_id': 'ou_xxxxx', 'name': '张三'}
user = sync_service.sync_user_from_feishu(user_data, account=account)
print(user)
```

2. 检查数据库连接

```python
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT 1")
print(cursor.fetchone())
```

3. 查看 Django 日志

```bash
tail -f /var/log/django/django.log
```

4. 检查用户表

```python
from accounts.models import User
print(User.objects.all())
```

#### 7.1.4 事件未触发

**问题：** 飞书事件未被处理

**可能原因：**
- WebSocket 进程未运行
- 事件订阅未配置
- 事件处理器错误

**解决方案：**

1. 检查 WebSocket 进程状态

```bash
# Supervisor
sudo supervisorctl status feishu_ws

# Systemd
sudo systemctl status feishu_ws
```

2. 检查飞书事件订阅配置

在飞书开放平台确认事件订阅已启用

3. 查看事件处理日志

```bash
tail -f /var/log/supervisor/feishu_ws.out.log | grep "Received"
```

4. 测试事件处理

```python
from feishu.event_handler import FeishuEventHandler

handler = FeishuEventHandler()
test_event = {
    'event_type': 'user_add',
    'tenant_key': 'xxx',
    'event': {
        'type': 'user_add',
        'user': {
            'user_id': 'ou_xxxxx',
            'name': '张三'
        }
    }
}
result = handler.handle_event(test_event)
print(result)
```

#### 7.1.5 API 令牌过期

**问题：** API 调用返回令牌错误

**可能原因：**
- 令牌已过期
- 缓存失效

**解决方案：**

1. 清除缓存

```python
from django.core.cache import cache
cache.delete('feishu:tenant_access_token')
```

2. 手动获取新令牌

```python
from feishu.client import FeishuAPIClient

client = FeishuAPIClient()
token = client.get_tenant_access_token()
print(token)
```

3. 检查令牌有效期

```python
from django.core.cache import cache
from django.core.cache.utils import make_template_fragment_key

token = cache.get('feishu:tenant_access_token')
print(f"Token: {token}")
```

### 7.2 日志查看

#### 7.2.1 Django 日志

**日志文件位置：**

- `/var/log/django/django.log` - Django 应用日志
- `/var/log/django/debug.log` - 调试日志

**查看实时日志：**

```bash
tail -f /var/log/django/django.log
```

**搜索错误：**

```bash
grep "ERROR" /var/log/django/django.log
grep "Feishu" /var/log/django/django.log
```

#### 7.2.2 WebSocket 日志

**日志文件位置：**

- `/var/log/supervisor/feishu_ws.out.log` - 标准输出日志
- `/var/log/supervisor/feishu_ws.err.log` - 错误日志

**查看实时日志：**

```bash
tail -f /var/log/supervisor/feishu_ws.out.log
tail -f /var/log/supervisor/feishu_ws.err.log
```

**搜索特定事件：**

```bash
grep "user.add" /var/log/supervisor/feishu_ws.out.log
grep "ERROR" /var/log/supervisor/feishu_ws.err.log
```

#### 7.2.3 系统日志

**查看 systemd 日志：**

```bash
journalctl -u feishu_ws -f
```

**查看最近 100 行：**

```bash
journalctl -u feishu_ws -n 100
```

**按时间过滤：**

```bash
journalctl -u feishu_ws --since "2026-02-02 10:00" --until "2026-02-02 12:00"
```

#### 7.2.4 日志级别配置

**在 `crm_backend/settings.py` 中配置：**

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'feishu': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

**日志级别说明：**

- `DEBUG` - 详细的调试信息
- `INFO` - 一般信息
- `WARNING` - 警告信息
- `ERROR` - 错误信息
- `CRITICAL` - 严重错误

### 7.3 调试技巧

#### 7.3.1 启用 Django 调试模式

```python
# crm_backend/settings.py
DEBUG = True
```

#### 7.3.2 使用 Django Shell 测试

```bash
python manage.py shell
```

```python
# 测试 API 客户端
from feishu.client import FeishuAPIClient
client = FeishuAPIClient()
token = client.get_tenant_access_token()
print(token)

# 测试同步服务
from feishu.services import FeishuUserSyncService
from accounts.models import Account
sync_service = FeishuUserSyncService()
account = Account.objects.first()
count = sync_service.sync_all_users(account=account)
print(f"Synced {count} users")
```

#### 7.3.3 使用断点调试

在代码中添加断点：

```python
import pdb; pdb.set_trace()
```

或使用 Django Debug Toolbar：

```bash
pip install django-debug-toolbar
```

#### 7.3.4 监控数据库查询

```python
# 启用查询日志
from django.db import connection
from django.conf import settings

if settings.DEBUG:
    connection.queries_loglevel = logging.DEBUG
```

#### 7.3.5 性能分析

```python
import time

def test_sync_performance():
    start_time = time.time()
    
    sync_service = FeishuUserSyncService()
    count = sync_service.sync_all_users(account=account)
    
    end_time = time.time()
    print(f"Synced {count} users in {end_time - start_time:.2f} seconds")
```

## 附录

### A. 参考文档

- [飞书开放平台文档](https://open.feishu.cn/)
- [飞书 OAuth 2.0 文档](https://open.feishu.cn/document/common-capabilities/sso/api/get-user-info)
- [飞书长连接文档](https://open.feishu.cn/document/ukTMukTMukTM/uYDNxYjL2QTM24iN0EjN)
- [飞书事件订阅文档](https://open.feishu.cn/document/ukTMukTMukTM/uUTNz4SN1MjL1UzM)
- [Django REST Framework 文档](https://www.django-rest-framework.org/)

### B. 版本历史

| 版本 | 日期 | 说明 |
|-----|------|------|
| 1.0.0 | 2026-02-02 | 初始版本 |

### C. 联系方式

如有问题，请联系开发团队：

- Email: dev-team@example.com
- Slack: #crm-development

---

*文档最后更新: 2026-02-02*
