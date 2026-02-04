# 飞书登录重定向问题修复文档

## 问题描述

飞书登录后出现"重定向次数过多"错误，用户无法成功登录系统。

**症状**：
- 用户点击飞书登录按钮
- 完成飞书OAuth授权
- 浏览器显示重定向循环或"重定向次数过多"错误
- 用户无法进入系统首页

## 根本原因

1. **前端路由问题**
   - 使用 `router.push()` 进行页面跳转不会触发完整的页面刷新
   - AuthProvider 的 `useEffect` 无法重新读取 localStorage 中的用户数据
   - 导致用户状态未更新，持续重定向到登录页

2. **时序问题**
   - localStorage 写入操作需要时间完成
   - 原有 100ms 延迟不足以确保数据写入完成
   - 页面跳转过快，localStorage 数据尚未就绪

3. **网络访问问题**
   - FRONTEND_URL 配置使用 `localhost:3000`
   - 飞书服务器无法访问本地 localhost 地址
   - OAuth 回调无法正确重定向到前端

## 修复方案

### 1. 修改前端回调页面

**文件**: `frontend/src/app/auth/callback/page.tsx`

**修改内容**:

```typescript
// 修改前
router.push("/dashboard");  // ❌ 不触发完整刷新
router.push("/login");

// 修改后
window.location.href = "/dashboard";  // ✅ 强制完整页面刷新
window.location.href = "/login";

// 延迟调整
setTimeout(() => {
  window.location.href = "/dashboard";
}, 500);  // 从 100ms 增加到 500ms
```

**原因**：
- `window.location.href` 强制浏览器进行完整的页面导航
- 确保 AuthProvider 组件重新初始化并读取 localStorage
- 500ms 延迟确保所有 localStorage 操作完成

### 2. 配置环境变量

**文件**: `.env`

**配置内容**:

```bash
FRONTEND_URL=http://192.168.31.69:3000
```

**说明**：
- 使用网络可访问的 IP 地址而非 localhost
- 飞书服务器能够正确访问前端回调地址
- 确保本地开发环境可通过网络访问

### 3. 优化飞书登录入口

**文件**: `frontend/src/app/login/page.tsx`

**修改内容**:

```typescript
const handleFeishuLogin = () => {
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  window.location.href = `${protocol}//${host}:8000/api/v1/feishu/login/`;
};
```

**原因**：
- 直接访问后端服务器（端口 8000）
- 避免通过 Next.js 代理可能导致的问题
- 动态获取当前主机名，适配不同部署环境

## 飞书 OAuth 完整流程

```
1. 用户点击"飞书登录"按钮
   ↓
2. 前端直接跳转到后端: http://<host>:8000/api/v1/feishu/login/
   ↓
3. 后端生成飞书授权 URL，重定向到飞书 OAuth 页面
   ↓
4. 用户在飞书页面完成授权
   ↓
5. 飞书服务器回调后端: http://<host>:8000/api/v1/feishu/callback/
   ↓
6. 后端处理用户信息，生成 JWT tokens
   ↓
7. 后端重定向到前端: http://192.168.31.69:3000/auth/callback?access=xxx&refresh=xxx&user=xxx
   ↓
8. 前端回调页面存储 tokens 到 localStorage
   ↓
9. 500ms 后使用 window.location.href 跳转到 /dashboard
   ↓
10. 完整页面刷新，AuthProvider 读取 localStorage
   ↓
11. 用户成功进入系统首页
```

## 验证步骤

### 测试前准备

1. **清除浏览器数据**
   - 清除浏览器缓存
   - 清除 localStorage: `localStorage.clear()`
   - 清除 Cookies
   - 或使用无痕模式

2. **确认配置**
   - 检查 `.env` 文件中 `FRONTEND_URL` 设置正确
   - 确认后端服务运行在 8000 端口
   - 确认前端服务运行在 3000 端口

### 测试流程

1. **访问登录页面**
   ```
   http://192.168.31.69:3000/login
   ```

2. **点击飞书登录按钮**
   - 应跳转到飞书授权页面

3. **完成飞书授权**
   - 登录飞书账号（如已登录则跳过）
   - 点击授权按钮

4. **验证回调**
   - 浏览器自动跳转到前端回调页面
   - 短暂显示"登录中，请稍候..."提示
   - 约 500ms 后自动跳转到 dashboard

5. **确认登录成功**
   - 成功进入系统首页
   - 页面右上角显示用户名和角色
   - 可以正常访问各功能模块

### 故障排查

如果仍有问题，按以下步骤排查：

1. **检查浏览器控制台**
   - 查看 Console 是否有错误信息
   - 查看 Network 标签，确认请求是否成功

2. **检查 localStorage**
   ```javascript
   // 在浏览器控制台执行
   console.log(localStorage.getItem('access_token'));
   console.log(localStorage.getItem('user'));
   ```
   应返回有效的 token 和用户信息

3. **检查后端日志**
   - 确认飞书回调是否成功
   - 确认 token 生成是否正常
   - 确认重定向 URL 是否正确

4. **检查网络访问**
   ```bash
   # 测试前端地址是否可访问
   curl http://192.168.31.69:3000
   
   # 测试后端地址是否可访问
   curl http://192.168.31.69:8000/api/v1/accounts/login/
   ```

## 相关文件清单

### 前端文件
- `frontend/src/app/login/page.tsx` - 登录页面
- `frontend/src/app/auth/callback/page.tsx` - OAuth 回调页面
- `frontend/src/lib/auth.tsx` - 认证上下文和工具函数

### 后端文件
- `feishu/views.py` - 飞书认证视图
- `feishu/urls.py` - 飞书路由配置
- `crm_backend/settings.py` - Django 配置

### 配置文件
- `.env` - 环境变量配置
- `frontend/next.config.mjs` - Next.js 配置

## 总结

本次修复解决了飞书登录的三个核心问题：

1. ✅ **使用完整页面刷新** - 确保 AuthProvider 正确初始化
2. ✅ **增加延迟时间** - 确保 localStorage 操作完成
3. ✅ **配置网络地址** - 确保飞书服务器可以回调

修复后，飞书登录流程稳定可靠，用户体验良好。
