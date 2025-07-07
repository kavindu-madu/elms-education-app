"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, BookOpen, Brain, Target, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function LoginForm() {
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password)

      // Check if user document exists, if not create it
      const userDocRef = doc(db, "users", userCredential.user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        const role = loginData.email === "admin@elms.lk" ? "admin" : "student"
        await setDoc(userDocRef, {
          name: userCredential.user.displayName || "User",
          email: userCredential.user.email,
          role: role,
          bookmarks: [],
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        })
      } else {
        // Update last login
        await updateDoc(userDocRef, {
          lastLogin: serverTimestamp(),
        })
      }

      toast({
        title: "Welcome back!",
        description: "Successfully signed in to A/L Exam Notes & QA",
      })
    } catch (error: any) {
      setError(error.message)
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            A/L Exam Notes & QA
          </h1>
          <p className="text-gray-600 text-lg">Advanced Learning Platform</p>
          <p className="text-sm text-gray-500 mt-2">Comprehensive study materials for GCE A/L students</p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/20">
            <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Interactive Notes</p>
          </div>
          <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/20">
            <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Practice Questions</p>
          </div>
          <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/20">
            <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Progress Tracking</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl bg-white/90 backdrop-blur-sm border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">Sign in to continue your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  className="h-12 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="h-12 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium shadow-lg transition-all duration-200"
                disabled={loading}
              >
                {loading ? <div className="loading-spinner mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="mt-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 A/L Exam Notes & QA</p>
          <p className="mt-1">Empowering GCE A/L Students Across Sri Lanka</p>
        </div>
      </div>
    </div>
  )
}
