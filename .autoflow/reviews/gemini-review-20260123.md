# CRM设计方案审查报告
**Reviewer:** Gemini CLI
**Date:** 2026-01-23

## 1. 系统集成架构审查

### 风险点 (Risks)
*   **飞书集成深度不足**: 设计文档仅提及"同步组织架构"和用户同步，未详述**离职/调岗/组织变动**触发的数据安全机制。若销售离职，其在CRM的Token若未及时失效或客户资产未自动冻结，存在数据泄露风险。
*   **数据冲突处理-写回确认缺失**: 虽然提到了"CRM为准"，但在异步集成（MQ）场景下，缺乏明确的**闭环确认机制** (Ack/Callback)。例如，CRM推送客户给渠道系统，若渠道系统处理失败（业务校验不过），CRM侧可能仍显示"已同步"。
*   **派工系统状态一致性**: 派工单状态依赖外部推送 (Webhook/API)。若网络中断导致"已完成"回调丢失，CRM中的商机可能一直卡在"实施中"阶段，影响回款流程。

### 优化建议 (Optimizations)
*   **增强飞书同步策略**:
    *   增加监听飞书 **User Status Change** 事件。
    *   设计"资产自动划拨"流程：当检测到User状态变为"离职/停用"时，自动触发Celery任务将其名下客户标记为"待分配"或转交给其上级。
*   **完善数据冲突与写回机制**:
    *   在 `IntegrationLog` 中增加 `correlation_id` 实现全链路追踪。
    *   引入 **"补偿事务" (Saga pattern)** 思想：若派工系统创建失败，自动触发CRM侧的"回滚"或"告警"状态，而不是仅仅记录日志。
    *   明确"写回确认"：外部系统在接收数据后，必须调用CRM的 `/ack` 接口或返回明确的业务处理结果ID，CRM更新 `sync_status` 为 `confirmed` 才算同步完成。

## 2. LTV计算逻辑审查

### 风险点 (Risks)
*   **数据完整性阈值偏差**: 设计文档中 `calcLtvDataCompleteness` 逻辑是 "missing_ratio > 0.8" (即仅需20%数据)。这与需求中强调的 **"40%阈值"** 严重不符。过低的数据要求会导致LTV评分虚高，误导销售策略。
*   **评分系统-隐性价值主观性**: "行业地位"、"合作关系"等字段依赖销售手动录入，缺乏外部数据验证，容易被人为操纵以提高客户分级。

### 优化建议 (Optimizations)
*   **修正数据完整性算法**:
    ```python
    def calc_data_quality_score(customer):
        # 必须满足 > 40% 的关键字段有值
        filled_weight = sum(f.weight for f in fields if f.value)
        total_weight = sum(f.weight for f in fields)
        if (filled_weight / total_weight) < 0.4:
            return "Insufficient" # 并在前端显著警告
    ```
*   **双轨制细化**: 明确区分 **"预测LTV"** (基于模型) 和 **"实际LTV"** (基于财务)。建议在UI上分开展示，"实际LTV"用于发奖金/提成，"预测LTV"仅用于销售指引，避免因预测不准引发薪酬争议。

## 3. 2026年技术趋势适配

### 趋势建议 (Trends)
*   **Agent化能力预留 (Agent-Ready Architecture)**:
    *   **风险**: 目前API设计仅面向前端UI，缺乏语义化描述。
    *   **建议**: 为关键API (如查询客户、创建商机) 编写详细的 **OpenAPI Specification (Swagger)**，并包含"自然语言用途描述"。这允许未来的 AI Agent (如 Claude/Gemini 助手) 通过 Function Calling 直接操作CRM，实现"语音建单"或"对话式查数"。
*   **多模态支持 (Multi-modal Support)**:
    *   **建议**: `Activity` 表不仅仅存储文本 `content`。
    *   预留 `content_vector` (PGVector字段) 用于存储沟通记录的语义向量，实现**语义搜索** ("查找所有对价格抱怨过的客户")。
    *   支持音频/文件内容的**自动摘要存储**。
*   **可扩展性设计**:
    *   考虑将 LTV 计算逻辑封装为独立的无服务器函数 (Serverless Function) 或微服务，因为LTV计算可能会随着模型复杂化（引入ML）而变得资源密集，避免阻塞主业务流程。
