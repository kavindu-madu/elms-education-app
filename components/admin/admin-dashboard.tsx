"use client"

import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BookOpen, Users, FolderOpen, BarChart3, LogOut, HelpCircle } from "lucide-react"
import { NotesManager } from "./notes-manager"
import { StudentsManager } from "./students-manager"
import { SubjectsManager } from "./subjects-manager"
import { PerformanceView } from "./performance-view"
import { QuestionsManager } from "./questions-manager"
import { SeedButton } from "./seed-button"
import { JsonUploadModal } from "./json-upload-modal"

export function AdminDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("notes")

  const handleLogout = async () => {
    await logout()
  }

  const handleUploadSuccess = () => {
    // Refresh current tab data
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ELMS Admin
                </h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <JsonUploadModal onSuccess={handleUploadSuccess} />
              <SeedButton />
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="hover:bg-red-50 hover:text-red-600 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 bg-white/80 backdrop-blur-sm shadow-sm">
            <TabsTrigger
              value="notes"
              className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="flex items-center space-x-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Questions</span>
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="flex items-center space-x-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger
              value="subjects"
              className="flex items-center space-x-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Subjects</span>
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="flex items-center space-x-2 data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-6">
            <NotesManager />
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <QuestionsManager />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <StudentsManager />
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <SubjectsManager />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
