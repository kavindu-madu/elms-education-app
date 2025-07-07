"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User, StudentProgress, Note } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Users, Award, TrendingUp } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function PerformanceView() {
  const [students, setStudents] = useState<User[]>([])
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [studentsSnapshot, progressSnapshot, notesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getDocs(collection(db, "studentProgress")),
        getDocs(collection(db, "notes")),
      ])

      const studentsData = studentsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            lastLogin: doc.data().lastLogin?.toDate(),
          }) as User,
      )

      const progressData = progressSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            completedAt: doc.data().completedAt?.toDate() || new Date(),
          }) as StudentProgress,
      )

      const notesData = notesSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          }) as Note,
      )

      setStudents(studentsData)
      setProgress(progressData)
      setNotes(notesData)
    } catch (error) {
      console.error("Error fetching performance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStudentProgress = (studentId: string) => {
    return progress.filter((p) => p.studentId === studentId)
  }

  const getAverageScore = (studentId: string) => {
    const studentProgress = getStudentProgress(studentId)
    if (studentProgress.length === 0) return 0

    const totalScore = studentProgress.reduce((sum, p) => sum + p.score, 0)
    return Math.round(totalScore / studentProgress.length)
  }

  const getOverallStats = () => {
    const totalStudents = students.length
    const totalNotes = notes.length
    const totalAttempts = progress.length
    const averageScore =
      progress.length > 0 ? Math.round(progress.reduce((sum, p) => sum + p.score, 0) / progress.length) : 0

    return { totalStudents, totalNotes, totalAttempts, averageScore }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const stats = getOverallStats()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Performance Overview</h2>
        <p className="text-muted-foreground">Track student progress and performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Total Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Student Performance */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Student Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {students.map((student) => {
            const studentProgress = getStudentProgress(student.id)
            const averageScore = getAverageScore(student.id)
            const completedNotes = studentProgress.length

            return (
              <Card key={student.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <CardDescription>{student.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-sm font-bold">{averageScore}%</span>
                  </div>
                  <Progress value={averageScore} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Notes Completed</p>
                      <p className="font-semibold">{completedNotes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Activity</p>
                      <p className="font-semibold">
                        {student.lastLogin ? student.lastLogin.toLocaleDateString() : "Never"}
                      </p>
                    </div>
                  </div>

                  {studentProgress.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recent Activity</p>
                      <div className="space-y-1">
                        {studentProgress.slice(0, 3).map((p) => {
                          const note = notes.find((n) => n.id === p.noteId)
                          return (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <span className="truncate">{note?.title || "Unknown Note"}</span>
                              <span className="font-semibold">{p.score}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {students.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No students found</h3>
            <p className="text-muted-foreground">Add students to view their performance data.</p>
          </div>
        )}
      </div>
    </div>
  )
}
