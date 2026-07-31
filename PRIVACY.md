# Privacy and data handling

`apple-health-analyst` separates local data processing from AI-generated
narrative.

## What stays local

- The CLI opens and parses the Apple Health ZIP on the machine where it runs.
- The CLI does not contain analytics, telemetry, advertising code, or network
  requests.
- Raw XML, ECG attachments, routes, and images are not sent anywhere by the
  CLI.

## What an AI agent may receive

The optional narrative step asks the active coding agent to read
`summary.json` and `insights.json`. These files contain derived personal health
and training measurements and may include device source names or attachment
filenames. If the agent uses a cloud-hosted model, that structured data is
processed according to the model provider's account, retention, and privacy
settings.

The raw ZIP is not required for the narrative step. Do not attach or paste it
into a model conversation.

## Output handling

Files in `output/` contain sensitive health information. The directory is
ignored by Git by default, but users remain responsible for backups, sharing,
and deletion. Review generated reports before sending them to another person.

The reports under `docs/` are built only from deterministic, programmatically
generated synthetic data. They do not represent the maintainer or any other
real person. The XML and ZIP files under `fixtures/` are also artificial test
data; their names, devices, and measurements were invented for parser tests.

## 中文说明

- CLI 在本机解析 Apple Health ZIP，本身不包含网络请求、遥测或广告代码。
- 原始 XML、心电图附件、路线和图片不会被 CLI 上传。
- narrative 步骤会让当前 AI agent 读取 `summary.json` 和
  `insights.json`；其中包含整理后的个人健康与训练指标，也可能包含设备来源名称或附件文件名。
- 如果使用云端模型，这些结构化数据将按模型服务商及账户的数据政策处理。
- narrative 不需要原始 ZIP，不应把 ZIP 直接附加或粘贴到模型对话中。
- `output/` 中的报告属于敏感健康资料，分享前应人工检查。
- `docs/` 下的公开示例只使用程序生成的确定性合成数据，不对应任何真实个人。
- `fixtures/` 下的 XML 和 ZIP 也是人工构造的测试数据，其中的姓名、设备与数值均非真实个人记录。
