import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "dnsmasq 管理",
  description: "管理 Docker 中 dnsmasq 的 DNS 记录",
}

const NAV_ITEMS = [
  { href: "/records", label: "域名记录" },
  { href: "/resolve", label: "解析测试" },
]

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
        <header className="border-b border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
            <span className="text-sm font-semibold">dnsmasq 管理</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 transition-opacity hover:opacity-70 dark:text-zinc-400">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
