# 学事智办竞赛演示网关

此网关是浏览器与 SF-FastGPT 官方应用 API 之间唯一的认证边界。它以 `stream=true`、`detail=true` 调用官方 `POST /api/v1/chat/completions`，并将 SSE 运行结果归一化为同源 JSON；它不会持久化会话内容、表单、API Key 或 Cookie。

## 配置与启动

```powershell
Copy-Item .env.example .env
# 在受限服务器环境变量或本机未提交的 .env 中填入真实值
npm start
```

`FASTGPT_MAIN_API_KEY`、`FASTGPT_T01_API_KEY`、`FASTGPT_T02_API_KEY`、`FASTGPT_T03_API_KEY` 必须是各自应用的最小用途 Key。不得放入 `contest_demo_web`、浏览器环境变量、截图、Git、交付文档或聊天记录。

## 运行边界

- 网关仅监听 `127.0.0.1`。生产环境由 Nginx 提供 TLS，并对 `/api/*` 反向代理到该本地端口。
- 浏览器只访问 `/api/main`、`/api/t01`、`/api/t02`、`/api/t03`。Main 通过“开始 → question”两轮识别终端，终端节点以平台 `flowResponses` 为准，前端不按关键词决定路由。
- T01、T02、T03 均直接调用各自应用；T02 的预览、取消、确认共用独立 T02 chatId，T03 另有自己的 chatId。
- 请假时长、审批路径、创建草稿和提交写入仍由冻结的 FastGPT T02 工作流和受鉴权 DEMO API 决定；网关不重写任何业务规则。
