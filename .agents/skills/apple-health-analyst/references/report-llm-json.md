# `report.llm.json` Schema v2

`report.llm.json` 是 narrative 的唯一输入。`render` 会校验它的字段，再生成 `report.md` 和 `report.html`。

## 必填结构
```json
{
  "schema_version": "2.0.0",
  "health_assessment": "string",
  "cross_metric_insights": ["string"],
  "behavioral_patterns": ["string"],
  "overview": "string",
  "key_findings": ["string"],
  "strengths": ["string"],
  "watchouts": ["string"],
  "actions_next_2_weeks": ["string"],
  "when_to_seek_care": ["string"],
  "data_limitations": ["string"],
  "chart_callouts": [
    {
      "chart_id": "sleep | recovery | activity | bodyComposition",
      "title": "string",
      "summary": "string"
    }
  ],
  "disclaimer": "string"
}
```

## v2 新增字段

### `health_assessment`（综合健康评估）
1-2 段文字，像门诊医生的"印象"段落：
- 综合判断当前健康状态（结合评分和跨指标信号）
- 指出主要关切（而不是罗列数据）
- 给出整体方向建议

### `cross_metric_insights`（跨指标关联分析）
2-4 条，每条必须关联两个以上指标：
- 格式："A 指标 + B 指标 → 健康含义 + 具体数据"
- 例如："睡眠不足 6 小时的夜晚，次日 HRV 平均下降 12%，说明自主神经系统对睡眠不足较敏感。"
- 来源：`insights.json` 中的 `crossMetric` 字段

### `behavioral_patterns`（行为模式识别）
1-3 条，描述检测到的行为模式：
- 格式："模式名称 + 数据表现 + 健康影响 + 调整建议"
- 来源：`insights.json` 中的 `crossMetric.patterns`

## 写作要求
- 所有文本默认中文。
- 每个数组至少写 1 项，尽量简洁，优先给普通用户能执行的建议。
- `chart_callouts` 必须覆盖现有图表 id，不能使用未知 id。
- 可以重排重点，但不能违背 `summary.json` / `insights.json` 中的结构化事实。
- 解释趋势时优先结合 `crossMetric` 的跨指标分析和 `historicalContext` 中的多时间窗口。
- 允许做相对专业的健康管理解读，例如恢复负荷、作息稳定性、训练与体重变化是否一致，但不要越界到诊断。
- **`key_findings` 必须引用跨指标证据**，不能只报告单一指标的变化。
- **`actions_next_2_weeks` 每条必须具体到时间、频率或数值**。

## 推荐风格
- `health_assessment`：1-2 段，综合判断 + 主要关切 + 整体方向。这是报告的核心价值。
- `cross_metric_insights`：2-4 条，因果链式的跨指标解读。
- `behavioral_patterns`：1-3 条，模式 + 影响 + 建议。
- `overview`：1 段，总结当前优先级和整体方向。
- `key_findings`：2-4 条，优先写"近期 vs 长期"的关键变化和健康含义。
- `strengths`：1-3 条，写趋势里正在变好的部分。
- `watchouts`：1-4 条，写最值得留意的风险和注意事项。
- `actions_next_2_weeks`：2-4 条，写具体、可执行、周期短的建议。
- `when_to_seek_care`：1-3 条，保守提醒，不写诊断。
- `data_limitations`：1-4 条，说明样本少、来源不稳、覆盖有限等问题。
- `disclaimer`：固定表达"健康管理参考，不构成医疗诊断"这类边界。
