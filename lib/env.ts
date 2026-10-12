import path from "node:path"

function withDefault(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw && raw.trim() ? raw.trim() : fallback
}

function toAbsolute(target: string): string {
  return path.isAbsolute(target) ? target : path.resolve(process.cwd(), target)
}

/**
 * Runtime configuration. Everything is optional with sensible defaults so the app can
 * boot locally without any env file; see `.env.example` for the deploy-time values.
 */
export const env = {
  /**
   * Prisma connection URL for the SQLite database — the single source of truth for records.
   *
   * Left as-is rather than resolved with `toAbsolute()`, because Prisma and better-sqlite3
   * resolve relative paths against the working directory, which is what `./data/...` in
   * `.env` already assumes.
   */
  databaseUrl: withDefault("DATABASE_URL", "file:./data/dnsmasq-admin.db"),
  /** Managed dnsmasq config file that this app regenerates on every apply. */
  confPath: toAbsolute(withDefault("DNSMASQ_ADMIN_CONF_PATH", "./data/dnsmasq-admin.conf")),
  /** Container that gets restarted through the Docker socket after an apply. */
  containerName: withDefault("DNSMASQ_CONTAINER_NAME", "dnsmasq"),
  dockerSocket: withDefault("DNSMASQ_ADMIN_DOCKER_SOCKET", "/var/run/docker.sock"),
  /** DNS server that the /resolve page queries. */
  dnsServer: withDefault("DNSMASQ_SERVER_IP", "127.0.0.1"),
}
