"use client"

import { useState, useEffect, useRef } from "react"
import type { Note, Subject, Category, Highlight } from "@/lib/types"
import { useAuth } from "@/components/providers/auth-provider"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Highlighter, BookmarkPlus, Palette, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { QuestionModal } from "./question-modal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface NoteReaderProps {
  note: Note
  onBack: () => void
  subjects: Subject[]
  categories: Category[]
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a", bg: "bg-yellow-200" },
  { name: "Green", value: "#bbf7d0", bg: "bg-green-200" },
  { name: "Blue", value: "#bfdbfe", bg: "bg-blue-200" },
  { name: "Pink", value: "#fbcfe8", bg: "bg-pink-200" },
  { name: "Purple", value: "#e9d5ff", bg: "bg-purple-200" },
]

export function NoteReader({ note, onBack, subjects, categories }: NoteReaderProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(0)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value)
  const [showQuestions, setShowQuestions] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const pages = note.pages || [
    {
      id: "1",
      pageNumber: 1,
      content: note.content,
      highlights: [],
    },
  ]

  const totalPages = pages.length
  const progress = ((currentPage + 1) / totalPages) * 100

  const subject = subjects.find((s) => s.id === note.subjectId)
  const category = categories.find((c) => c.id === note.categoryId)

  useEffect(() => {
    loadUserData()
  }, [note.id, user?.id])

  useEffect(() => {
    // Save reading progress
    if (user?.id) {
      const progressData = {
        noteId: note.id,
        currentPage,
        progress: Math.round(progress),
        lastRead: new Date().toISOString(),
      }
      localStorage.setItem(`reading_progress_${note.id}_${user.id}`, JSON.stringify(progressData))
    }
  }, [currentPage, note.id, user?.id, progress])

  const loadUserData = async () => {
    if (!user?.id) return

    try {
      // Load highlights
      const savedHighlights = localStorage.getItem(`highlights_${note.id}_${user.id}`)
      if (savedHighlights) {
        const parsedHighlights = JSON.parse(savedHighlights).map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
        }))
        setHighlights(parsedHighlights)
      }

      // Load reading progress
      const savedProgress = localStorage.getItem(`reading_progress_${note.id}_${user.id}`)
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress)
        setCurrentPage(progressData.currentPage || 0)
        setReadingProgress(progressData.progress || 0)
      }

      // Check if bookmarked
      const userDoc = await getDoc(doc(db, "users", user.id))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const bookmarks = userData.bookmarks || []
        setIsBookmarked(bookmarks.includes(note.id))
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
  }

  const handleHighlight = async () => {
    if (!selectedText || !user?.id) {
      toast({
        title: "No text selected",
        description: "Please select some text to highlight",
        variant: "destructive",
      })
      return
    }

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      text: selectedText,
      startOffset: 0,
      endOffset: selectedText.length,
      color: selectedColor,
      createdAt: new Date(),
    }

    const updatedHighlights = [...highlights, newHighlight]
    setHighlights(updatedHighlights)

    // Save to localStorage
    localStorage.setItem(`highlights_${note.id}_${user.id}`, JSON.stringify(updatedHighlights))

    toast({
      title: "Text highlighted",
      description: "Your highlight has been saved",
    })

    setSelectedText("")
    window.getSelection()?.removeAllRanges()
  }

  const toggleBookmark = async () => {
    if (!user?.id) return

    try {
      const userDocRef = doc(db, "users", user.id)

      if (isBookmarked) {
        // Remove bookmark logic would go here
        setIsBookmarked(false)
        toast({
          title: "Bookmark removed",
          description: "Note removed from your bookmarks",
        })
      } else {
        await updateDoc(userDocRef, {
          bookmarks: arrayUnion(note.id),
        })
        setIsBookmarked(true)
        toast({
          title: "Bookmarked",
          description: "Note added to your bookmarks",
        })
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error)
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      })
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentPage(currentPage + 1)
        setIsAnimating(false)
      }, 300)
    } else {
      // Finished reading, show questions prompt
      setShowQuestions(true)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentPage(currentPage - 1)
        setIsAnimating(false)
      }, 300)
    }
  }

  const renderContent = (content: string) => {
    let renderedContent = content

    // Apply highlights
    highlights.forEach((highlight) => {
      const highlightedText = `<mark class="highlight animate-pulse" style="background-color: ${highlight.color}; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${highlight.text}</mark>`
      renderedContent = renderedContent.replace(highlight.text, highlightedText)
    })

    return { __html: renderedContent }
  }

  if (showQuestions) {
    return <QuestionModal note={note} onBack={() => setShowQuestions(false)} onExit={onBack} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="hover:bg-blue-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="text-center flex-1 mx-4">
              <h1 className="text-lg font-semibold line-clamp-1 text-gray-800 dark:text-white">{note.title}</h1>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{subject?.name}</Badge>
                <span>•</span>
                <Badge variant="outline">{category?.name}</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!selectedText}>
                    <Palette className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {HIGHLIGHT_COLORS.map((color) => (
                    <DropdownMenuItem
                      key={color.value}
                      onClick={() => {
                        setSelectedColor(color.value)
                        handleHighlight()
                      }}
                      className="flex items-center space-x-2"
                    >
                      <div className={`w-4 h-4 rounded ${color.bg}`} />
                      <span>{color.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleBookmark}
                className={isBookmarked ? "bg-yellow-100 text-yellow-700" : ""}
              >
                {isBookmarked ? <Bookmark className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>
                  Page {currentPage + 1} of {totalPages}
                </span>
              </span>
              <span className="font-medium">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-3 bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </Progress>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card
            className={`min-h-[700px] shadow-2xl border-0 bg-white/90 backdrop-blur-sm transition-all duration-300 ${isAnimating ? "book-page page-flip" : ""}`}
          >
            <CardContent className="p-12">
              <div
                ref={contentRef}
                className="prose prose-lg max-w-none dark:prose-invert sinhala-text leading-relaxed"
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={renderContent(pages[currentPage]?.content || "")}
                style={{
                  fontSize: "1.1rem",
                  lineHeight: "1.8",
                  color: "#374151",
                }}
              />
            </CardContent>
          </Card>

          {/* Enhanced Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-white/80 backdrop-blur-sm hover:bg-blue-50 disabled:opacity-50 shadow-lg"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-3">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageIndex = Math.max(0, Math.min(currentPage - 3, totalPages - 7)) + i
                if (pageIndex >= totalPages) return null

                return (
                  <Button
                    key={pageIndex}
                    variant={pageIndex === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsAnimating(true)
                      setTimeout(() => {
                        setCurrentPage(pageIndex)
                        setIsAnimating(false)
                      }, 300)
                    }}
                    className={`w-12 h-12 rounded-full transition-all duration-200 ${
                      pageIndex === currentPage
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-110"
                        : "bg-white/80 backdrop-blur-sm hover:bg-blue-50 shadow-md"
                    }`}
                  >
                    {pageIndex + 1}
                  </Button>
                )
              })}
            </div>

            <Button
              onClick={nextPage}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"
            >
              <span>{currentPage === totalPages - 1 ? "Finish Reading" : "Next"}</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Enhanced Highlights Panel */}
          {highlights.length > 0 && (
            <Card className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-yellow-800">
                  <Highlighter className="h-5 w-5 mr-2" />
                  Your Highlights ({highlights.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {highlights.slice(0, 5).map((highlight) => (
                    <div
                      key={highlight.id}
                      className="p-4 rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md"
                      style={{
                        backgroundColor: highlight.color + "20",
                        borderLeftColor: highlight.color,
                      }}
                    >
                      <p className="text-sm font-medium text-gray-800">{highlight.text}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: highlight.color }} />
                        {highlight.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {highlights.length > 5 && (
                    <div className="text-center">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        +{highlights.length - 5} more highlights
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
