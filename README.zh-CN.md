# apple-health-analyst

[![npm version](https://img.shields.io/npm/v/apple-health-analyst)](https://www.npmjs.com/package/apple-health-analyst)
[![npm downloads](https://img.shields.io/npm/dm/apple-health-analyst)](https://www.npmjs.com/package/apple-health-analyst)
[![license](https://img.shields.io/npm/l/apple-health-analyst)](https://github.com/RuochenLyu/apple-health-analyst/blob/main/LICENSE)

本地分析 Apple Health 导出数据，生成互补的健康报告和多运动训练报告，强调跨指标推理、长期趋势和离线 HTML 输出。

不是数据仪表盘——手机就能看数据。这个工具的价值是把记录放回个人长期背景中：睡眠与恢复指标是否同向变化？作息规律性与 HRV 在现有样本中是否相关？训练负荷与恢复支持是否匹配？

**完全合成的示例报告（不含任何真实个人数据）：** [健康报告](https://kshift.me/apple-health-analyst/zh/report.html) · [运动报告](https://kshift.me/apple-health-analyst/zh/training.report.html) · [Health (EN)](https://kshift.me/apple-health-analyst/) · [Training (EN)](https://kshift.me/apple-health-analyst/training.report.html)

## 特性

- **跨指标模式分析** — 睡眠-HRV 配对样本、训练-恢复支持、作息规律性趋势；明确区分记录关联与因果
- **多运动趋势分析** — 按导出数据中实际存在的运动排序并分析，覆盖步行、跑步、力量、骑行、拳击、游泳、瑜伽等多种使用方式
- **独立运动报告** — 描述训练状态、恢复背景、负荷分布和各运动项目趋势，使用 **42 日负荷基线（CTL）、7 日近期负荷（ATL）和负荷差（TSB）**。这些 MET·分钟估算不直接代表体能、疲劳、新鲜度或恢复准备度
- **行为模式识别** — 周末战士、夜猫子漂移、睡眠补偿、恢复不足
- **拒绝伪精确评分** — 不把异构设备的睡眠、恢复和活动任意加权成“健康分”，直接展示个人趋势、样本覆盖和数据缺口
- **中英双语** — 根据用户语言自动生成中文或英文报告
- **隐私边界清晰** — 原始 ZIP/XML 的解析和报告渲染在本地完成且无遥测；若由托管 AI 模型撰写 narrative，结构化 JSON 可能由该模型服务商处理，详见 [PRIVACY.md](./PRIVACY.md)
- **离线 HTML 报告** — 单文件，内联 CSS + SVG 图表，双击即开
- **长期图表可读** — 每张图根据完整时间跨度统一采用日、周或月粒度，并使用真实时间刻度与密度感知的数据点

## 导出 Apple Health 数据

1. 打开 iPhone 上的**健康** App
2. 点击右上角头像
3. 滑到底部，点击**导出所有健康数据**
4. 等待导出完成（数据量大时可能需要几分钟），选择 **保存到"文件"** 或通过 AirDrop 传到电脑
5. 得到的 `导出.zip` 就是本工具的输入文件

官方导出里可能同时有多个 XML。主分析输入应是根节点为 `HealthData` 的那个 XML；`export_cda.xml` / `ClinicalDocument` 只是辅助文件。主 XML 文件名不固定，中文系统里可能叫 `导出.xml`，部分 ZIP 工具也可能把它显示成乱码文件名。

## 快速开始

一行命令安装 skill（支持 Claude Code、Codex、Cursor 等 [40+ agents](https://skills.sh)）：

```bash
npx skills add RuochenLyu/apple-health-analyst
```

然后和 agent 对话：

```text
帮我分析一下 Apple Health 导出数据 /path/to/导出.zip
```

**默认会同时生成健康报告和运动报告**，两份输出到同一个 `output/` 目录，顶栏和页脚有互相跳转链接。如果只想要其中一份，明确说出来即可：

```text
只要健康报告
只要运动报告
只生成运动报告，并重点分析拳击
```

只提到某个运动但没有说“只要”时，仍会生成两份报告，并在运动报告中优先分析该运动。拳击只是示例，不是特殊模式。

Skill 会在你提到 Apple Health 分析时自动激活。也可以显式调用——Claude Code 中用 `/apple-health-analyst`，Codex 中用 `$apple-health-analyst`。

Agent 会自动完成 **prepare → LLM 写 narrative → render** 全流程。两份 HTML（`report.html` 和 `training.report.html`）在顶栏有跨报告跳转按钮，可以随时来回切换。

> **注意：** npm 包提供可独立运行的 `prepare` 和 `render` CLI；narrative JSON 仍需由 AI agent 或兼容的人工文件提供。

Skill 配置在 [`.agents/skills/apple-health-analyst/`](https://github.com/RuochenLyu/apple-health-analyst/blob/main/.agents/skills/apple-health-analyst/SKILL.md)，包含角色定义、分析框架和 narrative schema。

## 覆盖指标

| 模块 | 指标 |
|------|------|
| 睡眠 | 时长、深睡/REM/核心占比、入睡/起床时间、规律性 |
| 恢复 | 静息心率、HRV、血氧、呼吸频率、最大摄氧量 |
| 活动 | 活动能量、锻炼分钟、站立小时、训练记录、分训练类型趋势 |
| 身体成分 | 体重、体脂率 |

## CLI

Codex Skill 底层调用的命令。一般不需要手动执行，了解即可。

```bash
# 1. prepare：解析 ZIP，生成结构化数据（--lang zh 生成中文，--lang en 生成英文）
#    可选：--top-sports N 控制运动报告里的主要运动项目数量（默认 5）
#    可选：--from/--to 使用严格 YYYY-MM-DD 分析边界
npx apple-health-analyst prepare /path/to/导出.zip --lang zh --out ./output
# 产出 summary.json + insights.json

# 2. (Codex 读取 insights.json，生成对应 narrative JSON)

# 3a. render：渲染健康报告（默认）
#    如果同时会把运动报告渲染到同一个 --out 目录，加 --with-cross-link 让顶栏/页脚
#    的跨报告跳转链接生效。只渲一份报告时**不要**加这个 flag，否则会指向一个
#    永远不会生成的文件。
npx apple-health-analyst render \
  --insights ./output/insights.json \
  --narrative ./output/report.llm.json \
  --with-cross-link \
  --out ./output
# 产出 report.html + report.md + report.llm.json

# 3b. render：渲染运动报告
npx apple-health-analyst render \
  --type training \
  --insights ./output/insights.json \
  --narrative ./output/training.report.llm.json \
  --with-cross-link \
  --out ./output
# 产出 training.report.html + training.report.md + training.report.llm.json
```

## 限制

- 不提供医学诊断或治疗建议
- 不分析 ECG 波形或 GPS 路线（仅计数）
- 步数和距离不跨设备合并

## 开发

要求 Node.js 22 或更新版本；本地推荐使用 Node.js 24。

```bash
npm run dev -- prepare /path/to/导出.zip --lang zh --out ./output  # 开发模式
npm run build   # 编译
npm test        # 测试
npm run check   # 清理构建并运行完整测试
npm run pack:check  # 验证发布包包含可运行 CLI
npm run demo:prepare  # 重新生成确定性的合成演示数据
npm run docs:build    # 校验并渲染中英文公开示例
```

## 开源协作

提交修改前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，尤其不要提交真实健康数据。
安全问题请按 [SECURITY.md](./SECURITY.md) 私下报告；版本变化记录在
[CHANGELOG.md](./CHANGELOG.md)。
