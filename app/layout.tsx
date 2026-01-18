import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Crimson_Pro } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClientWrapper } from "@/components/auth/client-wrapper"
import { SidebarProvider } from "@/components/layout/sidebar-context"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _crimsonPro = Crimson_Pro({ subsets: ["latin"], variable: "--font-serif" })

export const metadata: Metadata = {
  title: "Open Research Library",
  description:
    "Intelligence layer over academic knowledge - Search, organize, and synthesize research papers from OpenAlex, Semantic Scholar, and arXiv",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <SidebarProvider>
          <ClientWrapper>{children}</ClientWrapper>
        </SidebarProvider>
        <Analytics />
      </body>
    </html>
  )
}
