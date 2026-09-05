# 学事智办外部 DEMO API（Sealos DevBox）

此目录是部署到 Sealos DevBox 的无依赖 Node.js 服务。它只保存 `DEMO-*` 合成数据，服务端拒绝无 Token 启动；不包含、不接收、不声称处理学校生产数据。

## 接口与安全边界

- `GET /health`：无需认证，仅报告服务存活与数据边界。
- 其余接口均要求 `Authorization: Bearer <DEMO_API_TOKEN>`。
- 写接口还要求由 SF-FastGPT 工具配置注入 `X-Demo-User-Id: DEMO-STU-001`、`X-Demo-User-Role: student`；服务端拒绝其他身份。
- 提交、撤回、销假必须请求体提供 `confirmed: true`；销假另需 `returned_to_campus: true`。
- 状态文件仅位于部署目录的 `data/state.json`，写入采用临时文件原子替换；日志不记录 Token 与原因摘要。

## DevBox 启动

```bash
cd ~/project/student_affairs_mock
export PORT=3000
export DEMO_API_TOKEN='至少 32 字符的随机值'
npm test
nohup npm start > service.log 2>&1 &
```

Token 必须保存到 DevBox 的私有环境配置或受限文件中，不能提交至 Git、OpenAPI 文件、截图、聊天记录或提示词。服务启动后，需在 Sealos 添加指向内部端口 `3000` 的公网网络，并只把 HTTPS 地址填入 OpenAPI `servers.url`。

## 赛事说明

演示材料需写明“外部 HTTPS 模拟服务，仅用于合成 DEMO 数据；未连接阜阳师范大学或任何学校生产系统”。若赛事方禁止外部云服务，应立即下线公网网络，回退到本地 mock API 证据链。
