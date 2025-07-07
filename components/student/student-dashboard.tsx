"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { collection, query, getDocs, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Note, Subject, Category, Question } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpen,
  Search,
  LogOut,
  Clock,
  Highlighter,
  Bookmark,
  TrendingUp,
  Target,
  BookmarkPlus,
  Eye,
  Calendar,
  Star,
  Play,
  Brain,
  Zap,
  Trophy,
  ChevronRight,
  ImageIcon,
  Timer,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { EnhancedNoteReader } from "./enhanced-note-reader"
import { QuickQuizModal } from "./quick-quiz-modal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface ReadingStats {
  noteId: string
  totalReadingTime: number
  wordsRead: number
  pagesRead: number
  progress: number
  lastRead: Date
}

interface UserHighlight {
  id: string
  text: string
  color: string
  noteId: string
  noteTitle: string
  createdAt: Date
  note?: string
}

export function StudentDashboard() {
  const { user, logout } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<{ noteId?: string; subjectId?: string } | null>(null)
  const [readingStats, setReadingStats] = useState<ReadingStats[]>([])
  const [userHighlights, setUserHighlights] = useState<UserHighlight[]>([])
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("dashboard")
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("recent")

  useEffect(() => {
    fetchData()
    // Set up real-time updates
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [user])

  const fetchData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch all data in parallel
      const [notesSnapshot, subjectsSnapshot, categoriesSnapshot, questionsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "notes"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "categories")),
        getDocs(query(collection(db, "questions"), orderBy("createdAt", "desc"))),
      ])

      const notesData = notesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Note)
        .filter(
          (note) =>
            !note.assignedStudents || note.assignedStudents.length === 0 || note.assignedStudents.includes(user.id),
        )

      const subjectsData = subjectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Subject)
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category)
      const questionsData = questionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Question)

      // Load highlights from localStorage
      const allHighlights: UserHighlight[] = []
      notesData.forEach((note) => {
        const savedHighlights = localStorage.getItem(`highlights_${note.id}_${user.id}`)
        if (savedHighlights) {
          const highlights = JSON.parse(savedHighlights)
          highlights.forEach((h: any) => {
            allHighlights.push({
              id: h.id,
              text: h.text,
              color: h.color,
              noteId: note.id,
              noteTitle: note.title,
              createdAt: new Date(h.createdAt),
              note: h.note,
            })
          })
        }
      })

      // Load reading stats
      const statsData: ReadingStats[] = []
      notesData.forEach((note) => {
        const savedProgress = localStorage.getItem(`reading_progress_${note.id}_${user.id}`)
        if (savedProgress) {
          const progressData = JSON.parse(savedProgress)
          statsData.push({
            noteId: note.id,
            totalReadingTime: progressData.readingTime || 0,
            wordsRead: progressData.wordsRead || 0,
            pagesRead: progressData.currentPage + 1 || 1,
            progress: progressData.progress || 0,
            lastRead: new Date(progressData.lastRead || Date.now()),
          })
        }
      })

      // Load bookmarks
      const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)))
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data()
        setBookmarks(userData.bookmarks || [])
      }

      setNotes(notesData)
      setSubjects(subjectsData)
      setCategories(categoriesData)
      setQuestions(questionsData)
      setReadingStats(statsData)
      setUserHighlights(allHighlights.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotes = notes
    .filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.titleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.titleSi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesSubject = filterSubject === "all" || note.subjectId === filterSubject
      const matchesDifficulty = filterDifficulty === "all" || note.difficulty === filterDifficulty

      return matchesSearch && matchesSubject && matchesDifficulty
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case "title":
          return a.title.localeCompare(b.title)
        case "difficulty":
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 }
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        case "progress":
          const progressA = getReadingProgress(a.id)
          const progressB = getReadingProgress(b.id)
          return progressB - progressA
        default:
          return 0
      }
    })

  const bookmarkedNotes = notes.filter((note) => bookmarks.includes(note.id))
  const recentNotes = notes.slice(0, 6)
  const popularSubjects = subjects.slice(0, 4)

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId)
    return subject ? subject.name : "Unknown Subject"
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Unknown Category"
  }

  const getReadingProgress = (noteId: string) => {
    const stats = readingStats.find((s) => s.noteId === noteId)
    return stats?.progress || 0
  }

  const getTotalReadingTime = () => {
    return readingStats.reduce((total, stat) => total + stat.totalReadingTime, 0)
  }

  const getTotalWordsRead = () => {
    return readingStats.reduce((total, stat) => total + stat.wordsRead, 0)
  }

  const getQuestionsForNote = (noteId: string) => {
    return questions.filter((q) => q.noteId === noteId)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <CheckCircle className="h-3 w-3" />
      case "medium":
        return <AlertCircle className="h-3 w-3" />
      case "hard":
        return <Target className="h-3 w-3" />
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  if (selectedNote) {
    return (
      <EnhancedNoteReader
        note={selectedNote}
        onBack={() => setSelectedNote(null)}
        subjects={subjects}
        categories={categories}
      />
    )
  }

  if (selectedQuiz) {
    return (
      <QuickQuizModal
        noteId={selectedQuiz.noteId}
        subjectId={selectedQuiz.subjectId}
        onBack={() => setSelectedQuiz(null)}
        questions={questions}
        notes={notes}
        subjects={subjects}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Enhanced Header */}
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  A/L Exam Notes & QA
                </h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="hover:bg-red-50 hover:text-red-600 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 bg-white/80 backdrop-blur-sm shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="highlights" className="flex items-center space-x-2">
              <Highlighter className="h-4 w-4" />
              <span className="hidden sm:inline">Highlights</span>
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="flex items-center space-x-2">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Bookmarks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-blue-700">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Total Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">{notes.length}</div>
                  <p className="text-xs text-blue-600 mt-1">Available for study</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-green-700">
                    <Clock className="h-4 w-4 mr-2" />
                    Study Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-800">{Math.floor(getTotalReadingTime() / 60)}h</div>
                  <p className="text-xs text-green-600 mt-1">{getTotalReadingTime() % 60}m this session</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-purple-700">
                    <Highlighter className="h-4 w-4 mr-2" />
                    Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-800">{userHighlights.length}</div>
                  <p className="text-xs text-purple-600 mt-1">Key points saved</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-orange-700">
                    <Target className="h-4 w-4 mr-2" />
                    Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">{questions.length}</div>
                  <p className="text-xs text-orange-600 mt-1">Practice available</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Quiz
                  </CardTitle>
                  <CardDescription className="text-blue-100">Test your knowledge with random questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setSelectedQuiz({})} className="bg-white text-blue-600 hover:bg-blue-50">
                    <Play className="h-4 w-4 mr-2" />
                    Start Random Quiz
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Continue Learning
                  </CardTitle>
                  <CardDescription className="text-green-100">Pick up where you left off</CardDescription>
                </CardHeader>
                <CardContent>
                  {readingStats.length > 0 ? (
                    <Button
                      onClick={() => {
                        const lastRead = readingStats.sort((a, b) => b.lastRead.getTime() - a.lastRead.getTime())[0]
                        const note = notes.find((n) => n.id === lastRead.noteId)
                        if (note) setSelectedNote(note)
                      }}
                      className="bg-white text-green-600 hover:bg-green-50"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Continue Reading
                    </Button>
                  ) : (
                    <Button onClick={() => setActiveTab("notes")} className="bg-white text-green-600 hover:bg-green-50">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Reading
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Recent Notes
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("notes")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
                      onClick={() => setSelectedNote(note)}
                    >
                      {note.thumbnail && (
                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                          <img
                            src={note.thumbnail || "/placeholder.svg"}
                            alt={note.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2">{note.title}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge className={`${getDifficultyColor(note.difficulty)} text-xs`}>
                            {getDifficultyIcon(note.difficulty)}
                            <span className="ml-1">{note.difficulty}</span>
                          </Badge>
                          <span className="flex items-center">
                            <Timer className="h-3 w-3 mr-1" />
                            {note.estimatedReadTime || 5}min
                          </span>
                        </div>
                        {getReadingProgress(note.id) > 0 && (
                          <div className="mt-2">
                            <Progress value={getReadingProgress(note.id)} className="h-1" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Subjects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Popular Subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {popularSubjects.map((subject) => (
                    <Card
                      key={subject.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
                      onClick={() => {
                        setFilterSubject(subject.id)
                        setActiveTab("notes")
                      }}
                    >
                      {subject.thumbnail && (
                        <div className="aspect-square relative overflow-hidden rounded-t-lg">
                          <img
                            src={subject.thumbnail || "/placeholder.svg"}
                            alt={subject.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      <CardContent className="p-3 text-center">
                        <h3 className="font-medium text-sm">{subject.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notes.filter((n) => n.subjectId === subject.id).length} notes
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes Grid */}
            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map((note) => {
                  const progress = getReadingProgress(note.id)
                  const noteQuestions = getQuestionsForNote(note.id)
                  return (
                    <Card
                      key={note.id}
                      className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm hover:scale-105 group overflow-hidden"
                    >
                      {note.thumbnail && (
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={note.thumbnail || "/placeholder.svg"}
                            alt={note.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute top-2 right-2 flex gap-1">
                            {bookmarks.includes(note.id) && (
                              <Badge className="bg-yellow-500 text-white">
                                <Bookmark className="h-3 w-3 fill-current" />
                              </Badge>
                            )}
                            {note.pages?.some((page) => page.images && page.images.length > 0) && (
                              <Badge className="bg-blue-500 text-white">
                                <ImageIcon className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <div className="absolute bottom-2 left-2">
                            <Badge className={`${getDifficultyColor(note.difficulty)} text-xs`}>
                              {getDifficultyIcon(note.difficulty)}
                              <span className="ml-1">{note.difficulty}</span>
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {note.title}
                          </CardTitle>
                        </div>
                        <CardDescription>
                          <div className="flex items-center space-x-2 text-sm mb-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {getSubjectName(note.subjectId)}
                            </Badge>
                            <Badge variant="outline" className="bg-purple-100 text-purple-800">
                              {getCategoryName(note.categoryId)}
                            </Badge>
                          </div>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {note.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {progress > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>Progress</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center space-x-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{note.pages?.length || 1} pages</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Timer className="h-4 w-4" />
                              <span>{note.estimatedReadTime || 5}min</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedNote(note)
                            }}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                            size="sm"
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Read
                          </Button>
                          {noteQuestions.length > 0 && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedQuiz({ noteId: note.id })
                              }}
                              variant="outline"
                              size="sm"
                              className="hover:bg-green-50"
                            >
                              <Brain className="h-4 w-4 mr-1" />
                              Quiz ({noteQuestions.length})
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quiz" className="space-y-6">
            <div className="text-center py-8">
              <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Practice Questions</h2>
              <p className="text-muted-foreground mb-6">Test your knowledge with our comprehensive question bank</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedQuiz({})}>
                  <CardContent className="p-6 text-center">
                    <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Random Quiz</h3>
                    <p className="text-sm text-muted-foreground mb-4">Mixed questions from all subjects</p>
                    <Badge className="bg-yellow-100 text-yellow-800">{questions.length} questions</Badge>
                  </CardContent>
                </Card>

                {subjects.map((subject) => {
                  const subjectQuestions = questions.filter((q) => q.subjectId === subject.id)
                  if (subjectQuestions.length === 0) return null

                  return (
                    <Card
                      key={subject.id}
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setSelectedQuiz({ subjectId: subject.id })}
                    >
                      <CardContent className="p-6 text-center">
                        <Target className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">Subject-specific questions</p>
                        <Badge className="bg-blue-100 text-blue-800">{subjectQuestions.length} questions</Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="highlights" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Highlights</h2>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {userHighlights.length} highlights
              </Badge>
            </div>

            {userHighlights.length > 0 ? (
              <div className="space-y-4">
                {userHighlights.map((highlight) => (
                  <Card
                    key={highlight.id}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      const note = notes.find((n) => n.id === highlight.noteId)
                      if (note) setSelectedNote(note)
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: highlight.color }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 mb-2">{highlight.text}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {highlight.noteTitle}
                            </span>
                            {highlight.note && (
                              <span className="flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                {highlight.note}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {highlight.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Highlighter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No highlights yet</h3>
                <p className="text-muted-foreground">Start reading notes and highlight important content</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Bookmarked Notes</h2>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {bookmarkedNotes.length} bookmarks
              </Badge>
            </div>

            {bookmarkedNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarkedNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm hover:scale-105"
                    onClick={() => setSelectedNote(note)}
                  >
                    {note.thumbnail && (
                      <div className="aspect-video relative overflow-hidden rounded-t-lg">
                        <img
                          src={note.thumbnail || "/placeholder.svg"}
                          alt={note.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2 flex items-center">
                        <Bookmark className="h-5 w-5 text-yellow-500 fill-current mr-2" />
                        {note.title}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center space-x-2 text-sm">
                          <Badge variant="secondary">{getSubjectName(note.subjectId)}</Badge>
                          <Badge variant="outline">{getCategoryName(note.categoryId)}</Badge>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{note.pages?.length || 1} pages</span>
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookmarkPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
                <p className="text-muted-foreground">Bookmark notes to save them for later</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
