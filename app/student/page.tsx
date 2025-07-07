"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { StudentDashboard } from "@/components/student/student-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function StudentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/")
    }
  }, [user, loading, router])

  if (!mounted || loading) {
    return <LoadingSpinner />
  }

  if (!user || user.role !== "student") {
    return null
  }

  return <StudentDashboard />
}
