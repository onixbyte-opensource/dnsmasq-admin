import { promises as dnsPromises } from "node:dns"
import { io } from "next/cache"
import { env } from "./env"
import { isValidDomain } from "./validate"

const LOOKUP_TIMEOUT_MS = 5000

export type LookupOutcome =
  | { status: "a"; addresses: { address: string; ttl: number }[] }
  | { status: "cname"; targets: string[] }
  | { status: "empty"; detail: string }
  | { status: "error"; detail: string }

const FAILURE_REASONS: Record<string, string> = {
  ENOTFOUND: "域名不存在（NXDOMAIN）",
  ENODATA: "该域名没有对应类型的解析记录",
  ETIMEOUT: `查询超时，请确认 DNSMASQ_SERVER_IP 指向正确的 dnsmasq（当前 ${env.dnsServer}）`,
  ECONNREFUSED: "无法连接 DNS 服务器，请确认地址与端口",
  EREFUSED: "DNS 服务器拒绝查询",
  BADRESP: "DNS 服务器返回了无法解析的响应",
  SERVFAIL: "DNS 服务器返回 SERVFAIL，请检查 dnsmasq 配置",
}

function describeFailure(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (code && FAILURE_REASONS[code]) return FAILURE_REASONS[code]
  if (code) return `查询失败（${code}）${message ? `：${message}` : ""}`
  return failureMessage(error)
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isNoRecords(error: unknown): boolean {
  const { code } = (error ?? {}) as { code?: string }
  return code === "ENOTFOUND" || code === "ENODATA"
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error("ETIMEOUT"), { code: "ETIMEOUT" }))
    }, LOOKUP_TIMEOUT_MS)
  })

  return Promise.race([promise, guard]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

/**
 * Resolve a domain against the configured dnsmasq instance.
 *
 * A records are tried first because that is what most managed entries are; falling back to
 * CNAME keeps aliases visible too. `await io()` keeps the lookup out of the static shell
 * (it is a network read, and the result changes as records change).
 */
export async function lookupDomain(domain: string): Promise<LookupOutcome> {
  await io()

  if (!isValidDomain(domain)) {
    return { status: "error", detail: "域名格式不正确，例如 nas.home" }
  }

  const resolver = new dnsPromises.Resolver()
  resolver.setServers([env.dnsServer])

  try {
    const answers = await withTimeout(resolver.resolve4(domain, { ttl: true }))
    return {
      status: "a",
      addresses: answers.map((answer) => ({ address: answer.address, ttl: answer.ttl })),
    }
  } catch (error) {
    if (!isNoRecords(error)) return { status: "error", detail: describeFailure(error) }
  }

  try {
    const targets = await withTimeout(resolver.resolveCname(domain))
    if (targets.length === 0) return { status: "empty", detail: "没有 A 记录，也没有 CNAME 记录" }
    return { status: "cname", targets }
  } catch (error) {
    if (isNoRecords(error)) return { status: "empty", detail: "没有 A 记录，也没有 CNAME 记录" }
    return { status: "error", detail: describeFailure(error) }
  }
}
