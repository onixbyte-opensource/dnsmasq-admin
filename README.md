# dnsmasq-admin

一个极简的 Web UI，用来管理运行在 Docker 里的 dnsmasq 的 DNS 记录：域名记录的增删改查 + 一个解析测试页。

- **记录列表**（`/records`）：新增、编辑、启用/禁用、删除
- **解析测试**（`/resolve`）：向 dnsmasq 发起 DNS 查询，验证记录是否已生效
- 支持 **A** 与 **CNAME** 两种记录类型

## 工作原理

```
 ┌──────────┐   写 /etc/dnsmasq.d/dnsmasq-admin.conf    ┌──────────┐
 │  浏览器  │ ──────────> dnsmasq-admin (Next.js) ─────>│  dnsmasq │
 └──────────┘   Docker socket: restart 容器             └──────────┘
                      │
                      └─> SQLite（唯一数据源）
```

1. 所有记录存在 **SQLite** 里（用 Node 内置的 `node:sqlite`，**没有任何原生依赖**，`node_modules` 里不会多出编译产物）。
2. 增删改都只改数据库，**不会立刻影响 dnsmasq**。
3. 点「应用并重启」后：按启用的记录重新生成托管配置文件 → 通过 Docker socket 重启 dnsmasq 容器使其生效。

之所以做成手动触发，是为了让你能先攒一批改动，再一次性重启 —— 每次改一条就重启一次容器没有必要，而且会让 DNS 短暂中断。

`address=/example.com/192.168.1.10` 这种写法会同时命中 `example.com` 及其**所有子域名**，所以不需要额外的通配符语法。

## 本地开发

需要 **Node >= 22.5**（`node:sqlite` 的最低要求）。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>，会被重定向到 `/records`。

本地运行不需要配任何环境变量 —— 数据库默认落在 `./data/dnsmasq-admin.db`，生成的配置默认落在 `./data/dnsmasq-admin.conf`。需要调整时复制 `.env.example` 为 `.env.local`。

在 **Windows / macOS 桌面上开发**时没有 `/var/run/docker.sock`，点「应用并重启」会提示「重启已跳过」，但配置文件**照常生成**，可以用来自查内容是否正确。完整的重启链路需要在装了 Docker 的 Linux 上验证。

## Docker 部署

```bash
docker compose up -d
```

`docker-compose.yml` 里同时给了 dnsmasq 和 web 两个服务用于开箱联调。如果你已经有自己的 dnsmasq 容器，删掉 `dnsmasq` 服务，把 `dnsmasq-conf` 这个 volume 挂到你容器里的 `/etc/dnsmasq.d` 即可：

```yaml
# 在你现有的 dnsmasq 容器上加：
volumes:
  - dnsmasq-conf:/etc/dnsmasq.d
```

注意两个 volume 都要保留：`app-data` 存着 SQLite 数据库，删了等于记录全丢。

## 环境变量

见 [`.env.example`](.env.example)。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DNSMASQ_ADMIN_DB_PATH` | `./data/dnsmasq-admin.db` | SQLite 数据库位置 |
| `DNSMASQ_ADMIN_CONF_PATH` | `./data/dnsmasq-admin.conf` | 生成的托管配置文件 |
| `DNSMASQ_CONTAINER_NAME` | `dnsmasq` | 应用后要重启的容器名 |
| `DNSMASQ_ADMIN_DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket 路径；不存在则跳过重启 |
| `DNSMASQ_SERVER_IP` | `127.0.0.1` | `/resolve` 页查询用的 DNS 服务器 |

## ⚠️ 安全提示

**这个应用当前没有任何鉴权** —— 任何能访问到它的人都能增删 DNS 记录并重启你的 dnsmasq 容器。请务必只监听内网或本机，**不要暴露到公网**。

在 compose 里 `web` 挂载了 `/var/run/docker.sock`，这意味着该容器具备控制宿主机 Docker 的能力。这是设计使然（需要在应用后重启 dnsmasq），但应当把它当作高权限服务看待：不要用它跑不可信代码，端口只映射到内网网卡（如 `127.0.0.1:3000:3000`）而非 `0.0.0.0`。

## 技术备注（Next.js 16）

本项目启用了 `cacheComponents: true`，即 Next 16 的 Cache Components / PPR 模式。

这里踩到一个关键点：`node:sqlite` 是**同步**驱动，如果不显式处理，它的查询结果会在**构建期**被烤进预渲染的静态 shell，上线后页面永远显示构建时的旧数据。官方 issue 文档明确提到了这一点（`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md`），解法是在读库前 `await io()`，并把数据组件包在 `<Suspense>` 里 —— 参见 `lib/records.ts`。

同理，时间戳一律用 SQL 的 `datetime('now')` 而非 JS 的 `new Date()`，后者在预渲染阶段会直接导致构建失败。
