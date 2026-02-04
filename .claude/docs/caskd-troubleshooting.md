# CCB Daemon 连接问题排查指南

## 问题描述

当运行 `cask`、`gask`、`oask` 等命令时，出现以下错误：

```
[ERROR] cask daemon required but not available.
Start it with `caskd` (or enable autostart via CCB_CASKD_AUTOSTART=1).
```

即使对应的 daemon 进程（如 `caskd`）正在运行，命令仍然无法连接。

## 根本原因

客户端命令（如 `cask`）无法找到 daemon 的状态文件（如 `caskd.json`），该文件包含连接所需的信息：
- `host`: 监听地址
- `port`: 监听端口
- `token`: 认证令牌

状态文件位于 `$CCB_RUN_DIR/<daemon>.json`，但客户端默认不知道这个路径。

## 常见问题场景

### 场景 1: Daemon 进程运行但客户端找不到

**症状**: `ps aux | grep caskd` 显示进程存在，但 `cask` 命令报错

**原因**: 状态文件路径未正确配置

**解决**: 设置 `CCB_CASKD_STATE_FILE` 环境变量

### 场景 2: 状态文件存在但进程已死

**症状**: 状态文件存在，但其中记录的 PID 对应的进程不存在

**原因**: Daemon 进程异常退出，状态文件未清理

**解决**: 重新启动 daemon 并指定状态文件路径

### 场景 3: 多个 Daemon 实例冲突

**症状**: 多个同类型 daemon 进程运行，使用不同的状态文件

**原因**: 手动启动的 daemon 与自动管理的 daemon 冲突

**解决**: 关闭所有实例，重新启动单一实例

## 诊断步骤

### 1. 检查 daemon 进程是否运行

```bash
# 检查所有 CCB daemon
ps aux | grep -E "(caskd|gaskd|oaskd|laskd|daskd)" | grep -v grep
```

### 2. 检查 CCB_RUN_DIR 环境变量

```bash
echo $CCB_RUN_DIR
# 预期输出类似: /home/user/.cache/ccb/projects/<project_id>
```

### 3. 查看状态文件

```bash
# 列出所有状态文件
ls -la $CCB_RUN_DIR/*.json

# 查看具体状态
cat $CCB_RUN_DIR/caskd.json
cat $CCB_RUN_DIR/gaskd.json
cat $CCB_RUN_DIR/oaskd.json
```

### 4. 验证进程与状态文件匹配

```bash
# 获取状态文件中的 PID
PID=$(cat $CCB_RUN_DIR/caskd.json | grep -o '"pid": [0-9]*' | grep -o '[0-9]*')

# 检查该进程是否存在
ps aux | grep $PID | grep -v grep
```

## 解决方案

### 方法 1: 设置环境变量（推荐）

在 shell 配置文件（如 `~/.bashrc` 或 `~/.zshrc`）中添加：

```bash
# CCB Daemon 状态文件路径
export CCB_CASKD_STATE_FILE="$CCB_RUN_DIR/caskd.json"
export CCB_GASKD_STATE_FILE="$CCB_RUN_DIR/gaskd.json"
export CCB_OASKD_STATE_FILE="$CCB_RUN_DIR/oaskd.json"
export CCB_LASKD_STATE_FILE="$CCB_RUN_DIR/laskd.json"
export CCB_DASKD_STATE_FILE="$CCB_RUN_DIR/daskd.json"
```

### 方法 2: 调用时指定

```bash
CCB_CASKD_STATE_FILE=$CCB_RUN_DIR/caskd.json cask "your command"
CCB_GASKD_STATE_FILE=$CCB_RUN_DIR/gaskd.json gask "your command"
CCB_OASKD_STATE_FILE=$CCB_RUN_DIR/oaskd.json oask "your command"
```

### 方法 3: 手动重启 Daemon

当状态文件存在但进程已死时：

```bash
# 重启 caskd
caskd --state-file $CCB_RUN_DIR/caskd.json &

# 重启 gaskd
gaskd --state-file $CCB_RUN_DIR/gaskd.json &

# 重启 oaskd
oaskd --state-file $CCB_RUN_DIR/oaskd.json &
```

### 方法 4: 启用自动启动

设置环境变量让 daemon 自动启动：

```bash
export CCB_CASKD_AUTOSTART=1
export CCB_GASKD_AUTOSTART=1
export CCB_OASKD_AUTOSTART=1
```

## 快速修复脚本

创建 `~/.local/bin/ccb-fix-daemons.sh`：

```bash
#!/bin/bash
# CCB Daemon 快速修复脚本

if [ -z "$CCB_RUN_DIR" ]; then
    echo "Error: CCB_RUN_DIR not set"
    exit 1
fi

echo "CCB_RUN_DIR: $CCB_RUN_DIR"

# 设置状态文件环境变量
export CCB_CASKD_STATE_FILE="$CCB_RUN_DIR/caskd.json"
export CCB_GASKD_STATE_FILE="$CCB_RUN_DIR/gaskd.json"
export CCB_OASKD_STATE_FILE="$CCB_RUN_DIR/oaskd.json"
export CCB_LASKD_STATE_FILE="$CCB_RUN_DIR/laskd.json"
export CCB_DASKD_STATE_FILE="$CCB_RUN_DIR/daskd.json"

# 检查并重启 daemon
check_and_restart() {
    local name=$1
    local daemon=$2
    local state_file=$3

    if [ -f "$state_file" ]; then
        local pid=$(grep -o '"pid": [0-9]*' "$state_file" | grep -o '[0-9]*')
        if ! ps -p $pid > /dev/null 2>&1; then
            echo "[$name] Process $pid not found, restarting..."
            $daemon --state-file "$state_file" &
            sleep 2
            echo "[$name] Restarted"
        else
            echo "[$name] Running (PID: $pid)"
        fi
    else
        echo "[$name] State file not found, starting..."
        $daemon --state-file "$state_file" &
        sleep 2
        echo "[$name] Started"
    fi
}

check_and_restart "caskd" "caskd" "$CCB_CASKD_STATE_FILE"
check_and_restart "gaskd" "gaskd" "$CCB_GASKD_STATE_FILE"
check_and_restart "oaskd" "oaskd" "$CCB_OASKD_STATE_FILE"

echo ""
echo "Environment variables set:"
echo "  CCB_CASKD_STATE_FILE=$CCB_CASKD_STATE_FILE"
echo "  CCB_GASKD_STATE_FILE=$CCB_GASKD_STATE_FILE"
echo "  CCB_OASKD_STATE_FILE=$CCB_OASKD_STATE_FILE"
```

使用方法：
```bash
chmod +x ~/.local/bin/ccb-fix-daemons.sh
source ~/.local/bin/ccb-fix-daemons.sh
```

## 相关环境变量

| 变量名 | 用途 |
|--------|------|
| `CCB_RUN_DIR` | CCB 运行时目录（项目级别） |
| `CCB_CASKD_STATE_FILE` | caskd 状态文件路径 |
| `CCB_GASKD_STATE_FILE` | gaskd 状态文件路径 |
| `CCB_OASKD_STATE_FILE` | oaskd 状态文件路径 |
| `CCB_LASKD_STATE_FILE` | laskd 状态文件路径 |
| `CCB_DASKD_STATE_FILE` | daskd 状态文件路径 |
| `CCB_CASKD_AUTOSTART` | 自动启动 caskd (设为 1) |
| `CCB_GASKD_AUTOSTART` | 自动启动 gaskd (设为 1) |
| `CCB_OASKD_AUTOSTART` | 自动启动 oaskd (设为 1) |

## Daemon 对应关系

| Daemon | 客户端命令 | Provider |
|--------|-----------|----------|
| caskd | cask | Codex |
| gaskd | gask | Gemini |
| oaskd | oask | OpenCode |
| laskd | lask | Claude (local) |
| daskd | dask | Droid |

## 注意事项

1. `CCB_RUN_DIR` 由 CCB 框架自动设置，格式为 `~/.cache/ccb/projects/<project_id>`
2. 每个项目有独立的运行时目录和状态文件
3. Daemon 进程可能由父进程管理，手动启动的 daemon 需要指定正确的状态文件路径
4. 状态文件中的 `managed: true` 表示该 daemon 由 CCB 框架管理
5. 如果遇到端口冲突，daemon 会自动选择新端口并更新状态文件

## 故障排除流程图

```
客户端报错 "daemon not available"
           │
           ▼
    检查 daemon 进程是否运行
           │
     ┌─────┴─────┐
     │           │
   运行中      未运行
     │           │
     ▼           ▼
检查状态文件   启动 daemon
是否存在      (指定 --state-file)
     │           │
     ▼           ▼
验证 PID     等待启动完成
是否匹配         │
     │           ▼
     ▼       设置环境变量
设置环境变量     │
     │           ▼
     ▼        测试连接
  测试连接
```
