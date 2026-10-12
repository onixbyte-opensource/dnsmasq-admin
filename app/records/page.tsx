import Link from "next/link"
import { Suspense } from "react"
import { env } from "@/lib/env"
import { listRecords } from "@/lib/records"
import { applyConfigAction, deleteRecordAction, toggleRecordAction } from "./actions"
import { ApplyButton } from "./_components/ApplyButton"
import {
  disableButtonClass,
  enableButtonClass,
  secondaryButtonClass,
} from "./_components/button-styles"
import { DeleteButton } from "./_components/DeleteButton"

export const metadata = { title: "域名记录" }

const cardClass = "rounded-lg border border-black/10 p-4 dark:border-white/15"

// Status is shown as a tag rather than plain text so the column can be skimmed without
// reading the label. The dot carries the same meaning for anyone who cannot tell the two
// greens/zincs apart.
const statusTagBase =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
const statusTagEnabled = `${statusTagBase} bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20`
const statusTagDisabled = `${statusTagBase} bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/15`
const statusDotEnabled = "size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
const statusDotDisabled = "size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"

export default function RecordsPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">域名记录</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            记录保存在 SQLite 中，修改后需要「应用并重启」才会写入 dnsmasq 配置。
          </p>
        </div>
        <Link
          href="/records/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
          新增记录
        </Link>
      </header>

      <div className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">生效</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          配置文件：<code>{env.confPath}</code> · 目标容器：<code>{env.containerName}</code>
        </p>
        <div className="mt-3">
          <ApplyButton action={applyConfigAction} />
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>}>
        <RecordTable />
      </Suspense>
    </section>
  )
}

async function RecordTable() {
  const records = await listRecords()

  if (records.length === 0) {
    return (
      <div className={cardClass}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          还没有任何记录，点右上角「新增记录」开始。
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-white/15 dark:bg-white/5 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-2 font-medium">域名</th>
            <th className="px-4 py-2 font-medium">类型</th>
            <th className="px-4 py-2 font-medium">目标值</th>
            <th className="px-4 py-2 font-medium">状态</th>
            <th className="px-4 py-2 font-medium">备注</th>
            <th className="px-4 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/10">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="px-4 py-2 font-mono text-zinc-900 dark:text-zinc-100">
                {record.domain}
              </td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{record.type}</td>
              <td className="px-4 py-2 font-mono text-zinc-600 dark:text-zinc-400">
                {record.value}
              </td>
              <td className="px-4 py-2">
                <span className={record.enabled ? statusTagEnabled : statusTagDisabled}>
                  <span
                    aria-hidden="true"
                    className={record.enabled ? statusDotEnabled : statusDotDisabled}
                  />
                  {record.enabled ? "已启用" : "已禁用"}
                </span>
              </td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                {record.comment || "—"}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Link href={`/records/${record.id}`} className={secondaryButtonClass}>
                    编辑
                  </Link>
                  <form action={toggleRecordAction} className="inline-flex">
                    <input type="hidden" name="id" value={record.id} />
                    <input type="hidden" name="enabled" value={record.enabled ? "0" : "1"} />
                    <button
                      type="submit"
                      className={record.enabled ? disableButtonClass : enableButtonClass}>
                      {record.enabled ? "禁用" : "启用"}
                    </button>
                  </form>
                  <form action={deleteRecordAction} className="inline-flex">
                    <input type="hidden" name="id" value={record.id} />
                    <DeleteButton />
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
