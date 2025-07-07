"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Award, Smartphone } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/student")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">ELMS</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">Education Learning Management System</p>
          <p className="text-lg text-gray-500 dark:text-gray-400 sinhala-text">
            GCE A/L 2024-2025 සිසුන් සඳහා නවීන අධ්‍යාපන වේදිකාව
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Interactive Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Read notes with book-flipping UI and highlight important content</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Practice Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Attempt questions after reading notes and track your progress</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Smartphone className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Mobile First</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Optimized for mobile devices with responsive design</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Login Form */}
        <div className="max-w-md mx-auto">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
