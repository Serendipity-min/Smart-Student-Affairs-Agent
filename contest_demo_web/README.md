# 学事智办竞赛演示前端

这是与 SF-FastGPT 官方应用 API 配套的独立演示入口。它不替代既有的 T01/T02/T03 工作流、不存储平台密钥，也不直接访问学校系统。

## 启动

```powershell
cd contest_demo_gateway
Copy-Item .env.example .env
# 仅在服务器或受控本机 .env 内填写 FastGPT 的官方应用 API Key 和各应用 ID
npm start

cd ..\contest_demo_web
npm install
npm run dev
```

开发时 Vite 会将 `/api/*` 同源转发到 `http://127.0.0.1:8787`。生产部署时，应由 Nginx 将静态文件和 `/api/*` 一并反代给同一站点；浏览器只能访问网关路径，不能得到任一 FastGPT 应用 Key。

## 设计与安全边界

- 使用 React、TypeScript、Vite、Tailwind CSS、Radix Switch、React Hook Form、Zod、Sonner；制度答复仅用 `react-markdown + remark-gfm` 渲染。
- 事由为原生 `textarea`；时间为两个原生 `datetime-local`，提交时转换为不带时区的 `YYYY-MM-DD HH:mm:ss`，避免 UTC 漂移。
- 预览、成功与状态卡只在网关返回相应真实 DEMO 结果时显示；网关未配置或调用失败时不会生成假编号或假状态。
- `/?demo=1` 仅适配 16:9 录屏字号，不注入测试答案、申请结果或平台调试信息。
