# 本地备用工具 API

这是超星原生表单能力不足时的备选，不是当前主方案，也没有部署到公网。默认只绑定 `127.0.0.1`，首次启动会把基线库复制到 `mock_api/runtime/` 后再写入，因此不会污染 `database/student_affairs_v0.1.sqlite3`。

## 本机启动

```powershell
$env:STUDENT_AFFAIRS_DEMO_TOKEN = '<自行生成的临时长随机值>'
python mock_api/server.py
```

快速本机调试可运行：

```powershell
python mock_api/server.py --unsafe-local-no-auth
```

无认证模式被强制限制在回环地址。它不能供超星云端调用。

## 接入超星前

1. 先确认账号是否已有表单增删改查与插件节点；能完成就不用本 API。
2. 若必须接入，需部署 HTTPS、反向代理、限流和密钥管理，并由受信任网关注入登录身份头。
3. `X-Demo-User-Id` 与 `X-Demo-User-Role` 只是比赛合成身份映射，不能由最终用户自由填写。
4. 超星插件按 `chaoxing_package/05_插件与工具/openapi.yaml` 创建并设置 Bearer Token。

## 已实现接口

- `GET /health`
- `POST /v1/route/calculate`
- `POST /v1/leave/draft`
- `GET /v1/leave/{application_id}`
- `POST /v1/leave/{application_id}/submit`
- `POST /v1/leave/{application_id}/withdraw`
- `POST /v1/leave/{application_id}/cancel`

所有写接口都要求合成身份，提交/撤回/销假还要求请求体内 `confirmed=true`。

