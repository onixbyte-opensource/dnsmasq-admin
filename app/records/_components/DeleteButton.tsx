"use client"

import { dangerButtonClass } from "./button-styles"

export function DeleteButton() {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm("确定要删除这条记录吗？")) event.preventDefault()
      }}
      className={dangerButtonClass}>
      删除
    </button>
  )
}
