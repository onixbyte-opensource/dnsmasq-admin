import Link from "next/link"
import { RecordForm } from "../_components/RecordForm"
import { createRecordAction } from "../actions"

export const metadata = { title: "新增记录" }

export default function NewRecordPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/records"
          className="text-sm text-zinc-500 transition-opacity hover:opacity-70 dark:text-zinc-400">
          ← 返回列表
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">新增记录</h1>
      </header>

      <RecordForm action={createRecordAction} submitLabel="创建记录" cancelHref="/records" />
    </section>
  )
}
