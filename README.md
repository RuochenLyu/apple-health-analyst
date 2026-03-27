# apple-health-analyst

本地分析 Apple Health 导出数据，生成带有跨指标关联分析、行为模式识别和综合评分的中文健康报告。

不是数据仪表盘——手机就能看数据。这个工具的价值是**像健康顾问一样解读你的数据**：睡眠和恢复之间有什么关联？作息规律性如何影响 HRV？训练负荷和恢复能力是否匹配？

**[查看示例报告](https://ruochenlyu.github.io/apple-health-analyst/)**

## 特性

- **跨指标关联分析** — 睡眠-HRV 联动、训练-恢复平衡、作息规律性评估
- **行为模式识别** — 周末战士、夜猫子漂移、睡眠补偿、恢复不足
- **综合评分** — 睡眠/恢复/活动三维度 0-100 分，算法透明可解释
- **隐私优先** — 完全本地运行，不调用外部 API，不上传任何数据
- **离线 HTML 报告** — 单文件，内联 CSS + SVG 图表，双击即开

## 导出 Apple Health 数据

1. 打开 iPhone 上的**健康** App
2. 点击右上角头像
3. 滑到底部，点击**导出所有健康数据**
4. 等待导出完成（数据量大时可能需要几分钟），选择**储存到"文件"**或通过 AirDrop 传到电脑
5. 得到的 `导出.zip` 就是本工具的输入文件

## 快速开始

```bash
npm install
npm run build
node dist/cli.js analyze /path/to/导出.zip --out ./output
```

打开 `output/report.html` 查看报告。

## 覆盖指标

| 模块 | 指标 |
|------|------|
| 睡眠 | 时长、深睡/REM/核心占比、入睡/起床时间、规律性 |
| 恢复 | 静息心率、HRV、血氧、呼吸频率、最大摄氧量 |
| 活动 | 活动能量、锻炼分钟、站立小时、训练记录 |
| 身体成分 | 体重、体脂率 |

## CLI

### `analyze`（推荐）

一步完成：解析 ZIP → 分析 → 生成报告。

```bash
apple-health-analyst analyze <export.zip> \
  --from YYYY-MM-DD \
  --to YYYY-MM-DD \
  --format markdown,json,html \
  --out <dir>
```

### `prepare` + `render`（配合 LLM）

分两步：先生成结构化数据，让 LLM 写 narrative，再渲染报告。

```bash
# 1. 生成 summary.json + insights.json
apple-health-analyst prepare <export.zip> --out ./output

# 2. (LLM 读取 insights.json，生成 report.llm.json)

# 3. 渲染最终报告
apple-health-analyst render \
  --insights ./output/insights.json \
  --narrative ./output/report.llm.json \
  --out ./output
```

## 作为 Codex Skill 使用

```text
使用 $apple-health-analyst 分析 /path/to/export.zip
```

Skill 配置在 [`.agents/skills/apple-health-analyst/`](.agents/skills/apple-health-analyst/SKILL.md)，包含健康顾问角色定义、分析框架和 narrative schema。

## 限制

- 不提供医学诊断或治疗建议
- 不分析 ECG 波形或 GPS 路线（仅计数）
- 步数和距离不跨设备合并

## 开发

```bash
npm run dev -- analyze /path/to/export.zip --out ./output  # 开发模式
npm run build   # 编译
npm test        # 测试
```
