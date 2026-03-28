# apple-health-analyst

[![npm version](https://img.shields.io/npm/v/apple-health-analyst)](https://www.npmjs.com/package/apple-health-analyst)
[![npm downloads](https://img.shields.io/npm/dm/apple-health-analyst)](https://www.npmjs.com/package/apple-health-analyst)
[![license](https://img.shields.io/npm/l/apple-health-analyst)](https://github.com/RuochenLyu/apple-health-analyst/blob/main/LICENSE)

本地分析 Apple Health 导出数据，生成带有跨指标关联分析、行为模式识别和综合评分的健康报告。

不是数据仪表盘——手机就能看数据。这个工具的价值是**像健康顾问一样解读你的数据**：睡眠和恢复之间有什么关联？作息规律性如何影响 HRV？训练负荷和恢复能力是否匹配？

**[查看中文示例报告](https://ruochenlyu.github.io/apple-health-analyst/zh.html)** | **[English Sample Report](https://ruochenlyu.github.io/apple-health-analyst/)**

![示例报告](https://raw.githubusercontent.com/RuochenLyu/apple-health-analyst/main/docs/screenshot-zh.png)

## 特性

- **跨指标关联分析** — 睡眠-HRV 联动、训练-恢复平衡、作息规律性评估
- **行为模式识别** — 周末战士、夜猫子漂移、睡眠补偿、恢复不足
- **综合评分** — 睡眠/恢复/活动三维度 0-100 分，算法透明可解释
- **中英双语** — 根据用户语言自动生成中文或英文报告
- **隐私优先** — 完全本地运行，不调用外部 API，不上传任何数据
- **离线 HTML 报告** — 单文件，内联 CSS + SVG 图表，双击即开

## 导出 Apple Health 数据

1. 打开 iPhone 上的**健康** App
2. 点击右上角头像
3. 滑到底部，点击**导出所有健康数据**
4. 等待导出完成（数据量大时可能需要几分钟），选择 **保存到"文件"** 或通过 AirDrop 传到电脑
5. 得到的 `导出.zip` 就是本工具的输入文件

## 快速开始

一行命令安装 skill（支持 Claude Code、Codex、Cursor 等 [40+ agents](https://skills.sh)）：

```bash
npx skills add RuochenLyu/apple-health-analyst
```

然后和 agent 对话：

```text
帮我分析一下 Apple Health 导出数据 /path/to/导出.zip
```

Skill 会在你提到 Apple Health 分析时自动激活。也可以显式调用——Claude Code 中用 `/apple-health-analyst`，Codex 中用 `$apple-health-analyst`。

Agent 会自动完成 **prepare → LLM 写 narrative → render** 全流程，生成健康顾问级报告。

> **注意：** 这是一个 agent skill，不是独立 CLI 工具。`prepare` 和 `render` 在本地运行，但 narrative 步骤需要 LLM 能力——因此完整流程必须在 AI 编程 agent 中执行。

Skill 配置在 [`.agents/skills/apple-health-analyst/`](https://github.com/RuochenLyu/apple-health-analyst/blob/main/.agents/skills/apple-health-analyst/SKILL.md)，包含角色定义、分析框架和 narrative schema。

## 覆盖指标

| 模块 | 指标 |
|------|------|
| 睡眠 | 时长、深睡/REM/核心占比、入睡/起床时间、规律性 |
| 恢复 | 静息心率、HRV、血氧、呼吸频率、最大摄氧量 |
| 活动 | 活动能量、锻炼分钟、站立小时、训练记录 |
| 身体成分 | 体重、体脂率 |

## CLI

Codex Skill 底层调用的命令。一般不需要手动执行，了解即可。

```bash
# 1. prepare：解析 ZIP，生成结构化数据（--lang zh 生成中文，--lang en 生成英文）
npx apple-health-analyst prepare /path/to/导出.zip --lang zh --out ./output
# 产出 summary.json + insights.json

# 2. (Codex 读取 insights.json，生成 report.llm.json)

# 3. render：渲染最终报告（语言从 insights.json 自动检测）
npx apple-health-analyst render \
  --insights ./output/insights.json \
  --narrative ./output/report.llm.json \
  --out ./output
# 产出 report.html + report.md + report.llm.json
```

## 限制

- 不提供医学诊断或治疗建议
- 不分析 ECG 波形或 GPS 路线（仅计数）
- 步数和距离不跨设备合并

## 开发

```bash
npm run dev -- prepare /path/to/导出.zip --lang zh --out ./output  # 开发模式
npm run build   # 编译
npm test        # 测试
```
