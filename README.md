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

1. 所有记录存在 **SQLite** 里，通过 **Prisma** 读写（SQLite 驱动走 `@prisma/adapter-better-sqlite3`）。
2. 增删改都只改数据库，**不会立刻影响 dnsmasq**。
3. 点「应用并重启」后：按启用的记录重新生成托管配置文件 → 通过 Docker socket 重启 dnsmasq 容器使其生效。

之所以做成手动触发，是为了让你能先攒一批改动，再一次性重启 —— 每次改一条就重启一次容器没有必要，而且会让 DNS 短暂中断。

`address=/example.com/192.168.1.10` 这种写法会同时命中 `example.com` 及其**所有子域名**，所以不需要额外的通配符语法。

## 本地开发

需要 **Node >= 22.5**。

```bash
pnpm install
cp .env.example .env   # 见下方说明
pnpm db:migrate        # 建立 ./data/dnsmasq-admin.db 并建表
pnpm dev
```

> 数据库从此由迁移管理：`db:migrate` 会创建 `./data/dnsmasq-admin.db` 并应用 `prisma/migrations/` 里的 SQL。首次 `install` 后不必单独 `db:generate` —— `dev` 和 `build` 都会先跑 `prisma generate`（生成物在 `lib/generated/`，不进 git）。

打开 <http://localhost:3000>，会被重定向到 `/records`。

数据库连接串默认落在 `DATABASE_URL=file:./data/dnsmasq-admin.db`，生成的配置默认落在 `./data/dnsmasq-admin.conf`。需要调整时复制 `.env.example` 为 **`.env`**。

> ⚠️ 必须是 `.env` 而不是 `.env.local`：Next 两者都读，但 Prisma CLI 只读它自己的配置文件加载的东西，而 `prisma.config.ts` 里的 `dotenv/config` 指向 `.env`。放错地方会导致「应用连的是这个库、迁移跑的是另一个库」。

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
| `DATABASE_URL` | `file:./data/dnsmasq-admin.db` | Prisma 连接串；相对路径按**项目根目录**解析（不是 `prisma/`） |
| `DNSMASQ_ADMIN_CONF_PATH` | `./data/dnsmasq-admin.conf` | 生成的托管配置文件 |
| `DNSMASQ_CONTAINER_NAME` | `dnsmasq` | 应用后要重启的容器名 |
| `DNSMASQ_ADMIN_DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket 路径；不存在则跳过重启 |
| `DNSMASQ_SERVER_IP` | `127.0.0.1` | `/resolve` 页查询用的 DNS 服务器 |

> ⚠️ **破坏性变更**：旧版的 `DNSMASQ_ADMIN_DB_PATH` 已被 `DATABASE_URL` 取代（Prisma 要求 URL 形式，不再接受裸路径）。升级时把 Docker Compose / `.env` 里的这个变量改掉即可，数据库文件本身**不需要**动。

## 数据库迁移

改表结构的标准流程：

```bash
# 1. 改 prisma/schema.prisma
# 2. 生成一份迁移 SQL（会让你起名字），到 prisma/migrations/ 下
pnpm prisma migrate dev --create-only
# 3. 检查生成的 SQL，然后应用
pnpm db:migrate
```

Docker 部署下不需要手动跑第 3 步：容器启动时 `docker-entrypoint.sh` 会先执行 `prisma migrate deploy` 再起服务，所以**换镜像 = 自动升级表结构**。

可以用 `pnpm prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` 自检；输出只有 `-- This is an empty migration.` 才算干净。

`0001_baseline` 保持和 Prisma 自动生成的 SQL **逐字节一致**，这是有代价的：它放弃了 v0.1.0 手写表里的两条约束。

| 原本由数据库保证 | 现在由哪里保证 |
| --- | --- |
| `domain ... COLLATE NOCASE UNIQUE`（忽略大小写去重） | `lib/validate.ts` 的 `normalizeDomain()` 在入库前把域名转成小写 |
| `COLLATE NOCASE` 带来的大小写不敏感排序 | `lib/records.ts` 里的 `byDomain`，用 `localeCompare` 排序 |
| `CHECK (type IN ('A','CNAME'))` | `lib/validate.ts` 的表单校验 + `lib/db.ts` 里的 `RecordType` 联合类型 |

为什么甘愿降级：手写 SQL 加约束会让 Prisma 认为 schema 与迁移长期不一致（drift），之后任何人跑一次 `migrate dev`，它会提议一条「DROP TABLE + 重建」的迁移，并且在重建中悄悄丢掉那些约束 —— 这比失去约束本身更危险。现在 `migrate dev` 是安全的。你可以在用过 v0.1.0 的旧库上验证：它们的列级 `COLLATE NOCASE` 仍然存在。

`0003_enable_wal` 也是手写的：把 `journal_mode` 设成 WAL。它是数据库文件的持久属性，设一次就够 —— better-sqlite3 默认是 `delete` 模式，而 adapter 没有开放 PRAGMA 的入口。它不在 diff 的比对范围内，所以不会造成 drift。

`0002_normalise_timestamps` 修正了一个真实的时区 bug：旧表的时间戳默认值是 `datetime('now')`，存出来形如 `2026-10-09 08:55:10`，JavaScript 会把它当作**本地时间**解析，在 UTC+8 的机器上偏差 8 小时。这条迁移把历史行改成 Prisma 写入时的格式（`2026-10-09T08:55:10.000+00:00`），带明确时区偏移，两边都不会误解。

## ⚠️ 安全提示

**这个应用当前没有任何鉴权** —— 任何能访问到它的人都能增删 DNS 记录并重启你的 dnsmasq 容器。请务必只监听内网或本机，**不要暴露到公网**。

在 compose 里 `web` 挂载了 `/var/run/docker.sock`，这意味着该容器具备控制宿主机 Docker 的能力。这是设计使然（需要在应用后重启 dnsmasq），但应当把它当作高权限服务看待：不要用它跑不可信代码，端口只映射到内网网卡（如 `127.0.0.1:3000:3000`）而非 `0.0.0.0`。

## 技术备注（Next.js 16）

本项目启用了 `cacheComponents: true`，即 Next 16 的 Cache Components / PPR 模式。

这里踩到一个关键点：读库必须显式告诉 Next「这之后是 IO」，否则查询结果会在**构建期**被烤进预渲染的静态 shell，上线后页面永远显示构建时的旧数据。解法是在读库前 `await io()`，并把数据组件包在 `<Suspense>` 里 —— 参见 `lib/records.ts`。

注意这个 `await io()` **不能**因为「Prisma 是异步驱动」就删掉。官方文档里「awaited async database query 本身是 suspending point」的说法针对的是 `fetch` 这类 Next 认识的动态源；better-sqlite3 这种自建异步 driver 对 Next 是透明的，构建时它会照常解析、照常被烤进静态产物。实测办法：`grep proto.quanta.dev .next/server/app/records.html` —— 去掉守卫时能命中，加回来后为 0，`/records` 也从 `○ Static` 变回 `◐ Partial Prerender`。

同理，时间戳一律由数据库侧生成（`schema.prisma` 里的 `@default(now())` / `@updatedAt`），而不是 JS 的 `new Date()`，后者在预渲染阶段会直接导致构建失败。
