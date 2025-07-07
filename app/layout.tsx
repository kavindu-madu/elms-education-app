import type React from "react"
import type { Metadata } from "next"
import { Inter, Noto_Sans_Sinhala } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })
const sinhala = Noto_Sans_Sinhala({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "A/L Exam Notes & QA - Advanced Learning Platform",
  description: "Comprehensive study notes and question bank for GCE A/L students in Sri Lanka",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${sinhala.className}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
