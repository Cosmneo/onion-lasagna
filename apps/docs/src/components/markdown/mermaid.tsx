"use client"

import React, { useEffect, useId, useRef, useState } from "react"
import clsx from "clsx"
import mermaid from "mermaid"
import { useTheme } from "next-themes"

interface MermaidProps {
  chart: string
  className?: string
}

const darkThemeVariables = {
  primaryColor: "#6366f1",
  primaryTextColor: "#fff",
  primaryBorderColor: "#4f46e5",
  lineColor: "#94a3b8",
  secondaryColor: "#1e293b",
  tertiaryColor: "#334155",
  textColor: "#e2e8f0",
  mainBkg: "#1e293b",
  nodeBorder: "#4f46e5",
  clusterBkg: "#1e293b",
  clusterBorder: "#475569",
  titleColor: "#f1f5f9",
  edgeLabelBackground: "#1e293b",
}

const lightThemeVariables = {
  primaryColor: "#6366f1",
  primaryTextColor: "#1e293b",
  primaryBorderColor: "#4f46e5",
  lineColor: "#64748b",
  secondaryColor: "#f1f5f9",
  tertiaryColor: "#e2e8f0",
  textColor: "#1e293b",
  mainBkg: "#f8fafc",
  nodeBorder: "#4f46e5",
  clusterBkg: "#f1f5f9",
  clusterBorder: "#cbd5e1",
  titleColor: "#0f172a",
  edgeLabelBackground: "#f8fafc",
}

const Mermaid = ({ chart, className }: MermaidProps) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const id = useId().replace(/:/g, "")
  const [svg, setSvg] = useState<string>("")
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const isDark = resolvedTheme === "dark"

    mermaid.initialize({
      theme: "base",
      startOnLoad: false,
      themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
    })

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(`mermaid-${id}-${resolvedTheme}`, chart)
        setSvg(svg)
      } catch (error) {
        console.error("Mermaid diagram render error:", error)
        setSvg(`<pre style="color: red;">Mermaid Error: ${error}</pre>`)
      }
    }

    renderDiagram()
  }, [chart, id, resolvedTheme, mounted])

  if (!mounted) {
    return <div className={clsx("mermaid my-5 flex justify-center animate-pulse h-64 bg-muted rounded", className)} />
  }

  return (
    <div
      className={clsx("mermaid my-5 flex justify-center", className)}
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

const MermaidMemo = React.memo(Mermaid)
export default MermaidMemo
