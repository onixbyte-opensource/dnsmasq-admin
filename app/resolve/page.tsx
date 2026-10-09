import { Suspense } from "react"
import { env } from "@/lib/env"
import { lookupDomain } from "@/lib/dns"
import { normalizeDomain } from "@/lib/validate"

export const metadata = { title: "解析测试" }

const cardClass = "rounded-lg border border-black/10 p-4 dark:border-white/15"

export default function ResolvePage({ searchParams }: PageProps<"/resolve">) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">解析测试</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          向 <code>{env.dnsServer}</code> 发起查询，验证记录是否已经生效。
        </p>
      </header>

      <form action="/resolve" className="flex max-w-xl items-center gap-2">
        <input
          type="text"
          name="domain"
          defaultValue=""
          placeholder="nas.home"
          autoComplete="off"
          spellCheck={false}
          aria-label="域名"
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
          解析
        </button>
      </form>

      {/* searchParams are request-time data, so they must be awaited behind Suspense */}
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">查询中…</p>}>
        <LookupResult searchParams={searchParams} />
      </Suspense>
    </section>
  )
}

async function LookupResult({ searchParams }: Pick<PageProps<"/resolve">, "searchParams">) {
  const { domain } = await searchParams
  const raw = Array.isArray(domain) ? domain[0] : domain

  if (!raw) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">输入域名后点「解析」开始查询。</p>
    )
  }

  const target = normalizeDomain(raw)
  const outcome = await lookupDomain(target)

  return (
    <div className={cardClass}>
      <p className="mb-3 font-mono text-sm text-zinc-900 dark:text-zinc-100">{target}</p>

      {outcome.status === "a" ? (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-1 font-medium">IPv4 地址</th>
              <th className="py-1 font-medium">TTL</th>
            </tr>
          </thead>
          <tbody>
            {outcome.addresses.map((entry) => (
              <tr key={entry.address}>
                <td className="py-1 font-mono text-zinc-900 dark:text-zinc-100">{entry.address}</td>
                <td className="py-1 text-zinc-600 dark:text-zinc-400">{entry.ttl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {outcome.status === "cname" ? (
        <ul className="space-y-1 text-sm">
          {outcome.targets.map((item) => (
            <li key={item} className="font-mono text-zinc-900 dark:text-zinc-100">
              {target} → {item}
            </li>
          ))}
        </ul>
      ) : null}

      {outcome.status === "empty" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{outcome.detail}</p>
      ) : null}

      {outcome.status === "error" ? (
        <p className="text-sm text-red-600 dark:text-red-400">{outcome.detail}</p>
      ) : null}
    </div>
  )
}
