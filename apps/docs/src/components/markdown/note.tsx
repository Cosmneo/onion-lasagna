import { PropsWithChildren } from "react"
import clsx from "clsx"

import { cn } from "@/lib/utils"

type NoteProps = PropsWithChildren & {
  title?: string
  type?: "note" | "info" | "success" | "warning" | "danger"
}

const defaultTitles: Record<NoteProps["type"] & string, string> = {
  note: "Note",
  info: "Info",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
}

export default function Note({
  children,
  title,
  type = "note",
}: NoteProps) {
  const displayTitle = title ?? defaultTitles[type]
  const noteClassNames = clsx({
    "dark:bg-neutral-900 bg-neutral-50": type == "note",
    "dark:bg-cyan-950/50 bg-cyan-50 border-cyan-200 dark:border-cyan-900/50":
      type === "info",
    "dark:bg-green-950 bg-green-100 border-green-300 dark:border-green-900":
      type === "success",
    "dark:bg-orange-950 bg-orange-100 border-orange-300 dark:border-orange-900":
      type === "warning",
    "dark:bg-red-950 bg-red-100 border-red-300 dark:border-red-900":
      type === "danger",
  })

  return (
    <div
      className={cn(
        "rounded-md border px-3.5 py-0.5 text-sm tracking-wide",
        noteClassNames
      )}
    >
      <p className="-mb-3 text-sm font-semibold">{displayTitle}:</p>
      {children}
    </div>
  )
}
