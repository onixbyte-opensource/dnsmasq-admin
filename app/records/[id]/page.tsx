import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getRecord } from "@/lib/records"
import { RecordForm } from "../../_components/RecordForm"
import { updateRecordAction } from "../../actions"

export const metadata = { title: "编辑记录" }

export default function EditRecordPage({ params }: PageProps<"/records/[id]">) {
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">编辑记录</h1>

      {/* params are awaited inside Suspense so the shell can still be prerendered */}
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>}>
        <EditRecordForm params={params} />
      </Suspense>
    </section>
  )
}

async function EditRecordForm({ params }: Pick<PageProps<"/records/[id]">, "params">) {
  const { id } = await params
  const numericId = Number(id)

  // Guard against /records/abc: Number() would hand NaN to SQLite.
  if (!Number.isInteger(numericId) || numericId <= 0) notFound()

  const record = await getRecord(numericId)

  if (!record) notFound()

  return (
    <RecordForm
      action={updateRecordAction}
      record={record}
      submitLabel="保存修改"
      cancelHref="/records"
    />
  )
}
