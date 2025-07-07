"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/")
    }
  }, [user, loading, router])

  if (!mounted || loading) {
    return <LoadingSpinner />
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return <AdminDashboard />
}
