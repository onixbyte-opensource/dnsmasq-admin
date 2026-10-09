"use client"

export function DeleteButton() {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm("确定要删除这条记录吗？")) event.preventDefault()
      }}
      className="text-sm text-red-600 transition-opacity hover:opacity-70 dark:text-red-400">
      删除
    </button>
  )
}
