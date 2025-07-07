"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Note, Subject, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bookmark,
  BookmarkPlus,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Type,
  Palette,
  Download,
  Highlighter,
  X,
  Menu,
  Moon,
  Sun,
  Contrast,
  Coffee,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReadingProgress {
  currentPage: number
  progress: number
  readingTime: number
  wordsRead: number
  lastRead: Date
}

interface Highlight {
  id: string
  text: string
  color: string
  pageIndex: number
  createdAt: Date
  note?: string
}

interface Theme {
  name: string
  icon: React.ReactNode
  background: string
  text: string
  accent: string
}

const themes: Theme[] = [
  {
    name: "Classic",
    icon: <Sun className="h-4 w-4" />,
    background: "bg-white",
    text: "text-gray-900",
    accent: "text-blue-600",
  },
  {
    name: "Dark",
    icon: <Moon className="h-4 w-4" />,
    background: "bg-gray-900",
    text: "text-gray-100",
    accent: "text-blue-400",
  },
  {
    name: "Sepia",
    icon: <Coffee className="h-4 w-4" />,
    background: "bg-amber-50",
    text: "text-amber-900",
    accent: "text-amber-700",
  },
  {
    name: "High Contrast",
    icon: <Contrast className="h-4 w-4" />,
    background: "bg-black",
    text: "text-white",
    accent: "text-yellow-400",
  },
]

const highlightColors = [
  { name: "Yellow", color: "#fef08a", bg: "bg-yellow-200" },
  { name: "Green", color: "#bbf7d0", bg: "bg-green-200" },
  { name: "Blue", color: "#bfdbfe", bg: "bg-blue-200" },
  { name: "Pink", color: "#fbcfe8", bg: "bg-pink-200" },
  { name: "Purple", color: "#e9d5ff", bg: "bg-purple-200" },
  { name: "Orange", color: "#fed7aa", bg: "bg-orange-200" },
]

export function EnhancedNoteReader({
  note,
  onBack,
  subjects,
  categories,
}: {
  note: Note
  onBack: () => void
  subjects: Subject[]
  categories: Category[]
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  // State management
  const [currentPage, setCurrentPage] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [currentTheme, setCurrentTheme] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [readingSpeed, setReadingSpeed] = useState(1)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 })
  const [showImageModal, setShowImageModal] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [currentSpeakingWord, setCurrentSpeakingWord] = useState<number>(-1)

  // Refs
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pageContentRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Reading progress
  const [readingProgress, setReadingProgress] = useState<ReadingProgress>({
    currentPage: 0,
    progress: 0,
    readingTime: 0,
    wordsRead: 0,
    lastRead: new Date(),
  })

  // Get note pages
  const pages = note.pages || [{ content: note.content || "", title: note.title }]
  const totalPages = pages.length

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Load saved data
  useEffect(() => {
    if (!user) return

    // Load reading progress
    const savedProgress = localStorage.getItem(`reading_progress_${note.id}_${user.id}`)
    if (savedProgress) {
      const progress = JSON.parse(savedProgress)
      setReadingProgress(progress)
      setCurrentPage(progress.currentPage || 0)
    }

    // Load highlights
    const savedHighlights = localStorage.getItem(`highlights_${note.id}_${user.id}`)
    if (savedHighlights) {
      setHighlights(JSON.parse(savedHighlights))
    }

    // Load bookmark status
    const savedBookmarks = localStorage.getItem(`bookmarks_${user.id}`)
    if (savedBookmarks) {
      const bookmarks = JSON.parse(savedBookmarks)
      setIsBookmarked(bookmarks.includes(note.id))
    }

    // Load preferences
    const savedPrefs = localStorage.getItem(`reader_preferences_${user.id}`)
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs)
      setFontSize(prefs.fontSize || 16)
      setLineHeight(prefs.lineHeight || 1.6)
      setCurrentTheme(prefs.theme || 0)
      setReadingSpeed(prefs.readingSpeed || 1)
      setAutoAdvance(prefs.autoAdvance || false)
    }
  }, [note.id, user])

  // Start reading timer
  useEffect(() => {
    if (readingTimerRef.current) {
      clearInterval(readingTimerRef.current)
    }

    readingTimerRef.current = setInterval(() => {
      setReadingProgress((prev) => {
        const newProgress = {
          ...prev,
          readingTime: prev.readingTime + 1,
          lastRead: new Date(),
        }

        // Save progress
        if (user) {
          localStorage.setItem(`reading_progress_${note.id}_${user.id}`, JSON.stringify(newProgress))
        }

        return newProgress
      })
    }, 1000)

    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current)
      }
    }
  }, [note.id, user])

  // Save preferences
  const savePreferences = useCallback(() => {
    if (!user) return
    const prefs = {
      fontSize,
      lineHeight,
      theme: currentTheme,
      readingSpeed,
      autoAdvance,
    }
    localStorage.setItem(`reader_preferences_${user.id}`, JSON.stringify(prefs))
  }, [fontSize, lineHeight, currentTheme, readingSpeed, autoAdvance, user])

  useEffect(() => {
    savePreferences()
  }, [savePreferences])

  // Navigation functions
  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setCurrentPage(pageIndex)
      const progress = ((pageIndex + 1) / totalPages) * 100
      setReadingProgress((prev) => ({
        ...prev,
        currentPage: pageIndex,
        progress,
        wordsRead: prev.wordsRead + (pages[pageIndex]?.content?.split(" ").length || 0),
      }))
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      goToPage(currentPage - 1)
    }
  }

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }

    // Long press for highlighting
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }

    longPressTimerRef.current = setTimeout(() => {
      if (window.getSelection && window.getSelection()?.toString()) {
        const selection = window.getSelection()
        if (selection && selection.toString().trim()) {
          setSelectedText(selection.toString().trim())
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          setHighlightMenuPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          })
          setShowHighlightMenu(true)

          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }
      }
    }, 500)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }

    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

    // Swipe threshold
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        prevPage() // Swipe right = previous page
      } else {
        nextPage() // Swipe left = next page
      }
    }

    touchStartRef.current = null
  }

  // Text-to-speech functions
  const toggleSpeech = () => {
    if (isPlaying) {
      stopSpeech()
    } else {
      startSpeech()
    }
  }

  const startSpeech = () => {
    if (!pages[currentPage]?.content) return

    stopSpeech()

    const utterance = new SpeechSynthesisUtterance(pages[currentPage].content)
    utterance.rate = readingSpeed
    utterance.volume = isMuted ? 0 : 1

    // Word-by-word highlighting
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        setCurrentSpeakingWord(event.charIndex)
      }
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setCurrentSpeakingWord(-1)
      if (autoAdvance && currentPage < totalPages - 1) {
        setTimeout(() => {
          nextPage()
          setTimeout(startSpeech, 500)
        }, 1000)
      }
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setCurrentSpeakingWord(-1)
    }

    speechSynthRef.current = utterance
    speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  const stopSpeech = () => {
    if (speechSynthRef.current) {
      speechSynthesis.cancel()
      setIsPlaying(false)
      setCurrentSpeakingWord(-1)
    }
  }

  // Bookmark functions
  const toggleBookmark = async () => {
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.id)

      if (isBookmarked) {
        await updateDoc(userDocRef, {
          bookmarks: arrayRemove(note.id),
        })
        setIsBookmarked(false)
        toast({ title: "Bookmark removed" })
      } else {
        await updateDoc(userDocRef, {
          bookmarks: arrayUnion(note.id),
        })
        setIsBookmarked(true)
        toast({ title: "Note bookmarked" })
      }

      // Update localStorage
      const savedBookmarks = localStorage.getItem(`bookmarks_${user.id}`)
      const bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : []

      if (isBookmarked) {
        const updatedBookmarks = bookmarks.filter((id: string) => id !== note.id)
        localStorage.setItem(`bookmarks_${user.id}`, JSON.stringify(updatedBookmarks))
      } else {
        bookmarks.push(note.id)
        localStorage.setItem(`bookmarks_${user.id}`, JSON.stringify(bookmarks))
      }
    } catch (error) {
      toast({ title: "Error updating bookmark", variant: "destructive" })
    }
  }

  // Highlight functions
  const addHighlight = (color: string) => {
    if (!selectedText || !user) return

    const highlight: Highlight = {
      id: Date.now().toString(),
      text: selectedText,
      color,
      pageIndex: currentPage,
      createdAt: new Date(),
    }

    const updatedHighlights = [...highlights, highlight]
    setHighlights(updatedHighlights)
    localStorage.setItem(`highlights_${note.id}_${user.id}`, JSON.stringify(updatedHighlights))

    setShowHighlightMenu(false)
    setSelectedText("")

    // Clear selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }

    toast({ title: "Text highlighted" })
  }

  const removeHighlight = (highlightId: string) => {
    const updatedHighlights = highlights.filter((h) => h.id !== highlightId)
    setHighlights(updatedHighlights)
    if (user) {
      localStorage.setItem(`highlights_${note.id}_${user.id}`, JSON.stringify(updatedHighlights))
    }
    toast({ title: "Highlight removed" })
  }

  // Render content with highlights and images
  const renderContent = (content: string) => {
    if (!content) return null

    // Process markdown images
    const imageRegex = /!\[([^\]]*)\]$$([^)]+)$$/g
    const parts = content.split(imageRegex)
    const elements = []

    for (let i = 0; i < parts.length; i += 3) {
      // Text content
      if (parts[i]) {
        let textContent = parts[i]

        // Apply highlights
        const pageHighlights = highlights.filter((h) => h.pageIndex === currentPage)
        pageHighlights.forEach((highlight) => {
          const regex = new RegExp(`(${highlight.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
          textContent = textContent.replace(
            regex,
            `<mark style="background-color: ${highlight.color}; cursor: pointer;" data-highlight-id="${highlight.id}">$1</mark>`,
          )
        })

        // Apply speaking word highlight
        if (isPlaying && currentSpeakingWord >= 0) {
          const words = textContent.split(" ")
          const wordIndex = Math.floor(currentSpeakingWord / 10) // Approximate word index
          if (words[wordIndex]) {
            words[wordIndex] =
              `<span class="speaking-word animate-pulse bg-blue-200 px-1 rounded">${words[wordIndex]}</span>`
            textContent = words.join(" ")
          }
        }

        elements.push(
          <div
            key={`text-${i}`}
            dangerouslySetInnerHTML={{ __html: textContent }}
            className="prose prose-lg max-w-none"
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (target.dataset.highlightId) {
                removeHighlight(target.dataset.highlightId)
              }
            }}
          />,
        )
      }

      // Image content
      if (parts[i + 1] !== undefined && parts[i + 2]) {
        const altText = parts[i + 1]
        const imageUrl = parts[i + 2]

        elements.push(
          <div key={`image-${i}`} className="my-6">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={altText}
              className="w-full max-w-2xl mx-auto rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setShowImageModal(imageUrl)}
              loading="lazy"
            />
            {altText && <p className="text-center text-sm text-muted-foreground mt-2 italic">{altText}</p>}
          </div>,
        )
      }
    }

    return elements
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isFocusMode) {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault()
            prevPage()
            break
          case "ArrowRight":
            e.preventDefault()
            nextPage()
            break
          case " ":
            e.preventDefault()
            toggleSpeech()
            break
          case "Escape":
            e.preventDefault()
            setIsFocusMode(false)
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isFocusMode, currentPage, totalPages, isPlaying])

  const currentThemeStyle = themes[currentTheme]
  const subject = subjects.find((s) => s.id === note.subjectId)
  const category = categories.find((c) => c.id === note.categoryId)

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${currentThemeStyle.background} ${currentThemeStyle.text}`}
    >
      {/* Header - Hidden in focus mode */}
      {!isFocusMode && (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {isMobile ? "" : "Back"}
                </Button>
                <div className="hidden md:block">
                  <h1 className="text-lg font-semibold line-clamp-1">{note.title}</h1>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    {subject && <Badge variant="secondary">{subject.name}</Badge>}
                    {category && <Badge variant="outline">{category.name}</Badge>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Mobile Menu */}
                {isMobile ? (
                  <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Reading Options</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-6 mt-6">
                        {/* Audio Controls */}
                        <div className="space-y-3">
                          <h3 className="font-medium">Audio Controls</h3>
                          <div className="flex gap-2">
                            <Button onClick={toggleSpeech} size="sm" className="flex-1">
                              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                              {isPlaying ? "Pause" : "Play"}
                            </Button>
                            <Button onClick={() => setIsMuted(!isMuted)} variant="outline" size="sm">
                              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm">Speed: {readingSpeed}x</label>
                            <Slider
                              value={[readingSpeed]}
                              onValueChange={(value) => setReadingSpeed(value[0])}
                              min={0.5}
                              max={2}
                              step={0.1}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Display Settings */}
                        <div className="space-y-3">
                          <h3 className="font-medium">Display</h3>
                          <div className="space-y-2">
                            <label className="text-sm">Font Size: {fontSize}px</label>
                            <Slider
                              value={[fontSize]}
                              onValueChange={(value) => setFontSize(value[0])}
                              min={12}
                              max={24}
                              step={1}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm">Line Height: {lineHeight}</label>
                            <Slider
                              value={[lineHeight]}
                              onValueChange={(value) => setLineHeight(value[0])}
                              min={1.2}
                              max={2.0}
                              step={0.1}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Themes */}
                        <div className="space-y-3">
                          <h3 className="font-medium">Theme</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {themes.map((theme, index) => (
                              <Button
                                key={theme.name}
                                variant={currentTheme === index ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentTheme(index)}
                                className="justify-start"
                              >
                                {theme.icon}
                                <span className="ml-2">{theme.name}</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Highlights */}
                        {highlights.filter((h) => h.pageIndex === currentPage).length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-medium">Page Highlights</h3>
                            <ScrollArea className="h-32">
                              <div className="space-y-2">
                                {highlights
                                  .filter((h) => h.pageIndex === currentPage)
                                  .map((highlight) => (
                                    <div
                                      key={highlight.id}
                                      className="p-2 rounded border text-sm"
                                      style={{ backgroundColor: highlight.color }}
                                    >
                                      <p className="line-clamp-2">{highlight.text}</p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeHighlight(highlight.id)}
                                        className="mt-1 h-6 px-2"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <>
                    {/* Desktop Controls */}
                    <Button onClick={toggleSpeech} variant="outline" size="sm">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button onClick={() => setIsMuted(!isMuted)} variant="outline" size="sm">
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button onClick={toggleBookmark} variant="outline" size="sm">
                      {isBookmarked ? (
                        <Bookmark className="h-4 w-4 fill-current text-yellow-500" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                    </Button>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-80">
                        <SheetHeader>
                          <SheetTitle>Reading Settings</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-6 mt-6">
                          {/* Font Settings */}
                          <div className="space-y-3">
                            <h3 className="font-medium flex items-center">
                              <Type className="h-4 w-4 mr-2" />
                              Typography
                            </h3>
                            <div className="space-y-2">
                              <label className="text-sm">Font Size: {fontSize}px</label>
                              <Slider
                                value={[fontSize]}
                                onValueChange={(value) => setFontSize(value[0])}
                                min={12}
                                max={24}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm">Line Height: {lineHeight}</label>
                              <Slider
                                value={[lineHeight]}
                                onValueChange={(value) => setLineHeight(value[0])}
                                min={1.2}
                                max={2.0}
                                step={0.1}
                                className="w-full"
                              />
                            </div>
                          </div>

                          {/* Theme Settings */}
                          <div className="space-y-3">
                            <h3 className="font-medium flex items-center">
                              <Palette className="h-4 w-4 mr-2" />
                              Theme
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              {themes.map((theme, index) => (
                                <Button
                                  key={theme.name}
                                  variant={currentTheme === index ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentTheme(index)}
                                  className="justify-start"
                                >
                                  {theme.icon}
                                  <span className="ml-2">{theme.name}</span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Audio Settings */}
                          <div className="space-y-3">
                            <h3 className="font-medium flex items-center">
                              <Volume2 className="h-4 w-4 mr-2" />
                              Audio
                            </h3>
                            <div className="space-y-2">
                              <label className="text-sm">Reading Speed: {readingSpeed}x</label>
                              <Slider
                                value={[readingSpeed]}
                                onValueChange={(value) => setReadingSpeed(value[0])}
                                min={0.5}
                                max={2}
                                step={0.1}
                                className="w-full"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="autoAdvance"
                                checked={autoAdvance}
                                onChange={(e) => setAutoAdvance(e.target.checked)}
                                className="rounded"
                              />
                              <label htmlFor="autoAdvance" className="text-sm">
                                Auto-advance pages
                              </label>
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </>
                )}

                <Button onClick={() => setIsFocusMode(true)} variant="outline" size="sm">
                  <Maximize className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Focus</span>}
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Focus Mode Exit Button */}
      {isFocusMode && (
        <div className="fixed top-4 right-4 z-50">
          <Button onClick={() => setIsFocusMode(false)} variant="outline" size="sm">
            <Minimize className="h-4 w-4 mr-2" />
            Exit Focus
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className={`${isFocusMode ? "p-8" : "container mx-auto px-4 py-6"}`}>
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>
              <span>{Math.round(readingProgress.progress)}% complete</span>
            </div>
            <Progress value={readingProgress.progress} className="h-2" />
          </div>

          {/* Page Content */}
          <Card className={`${currentThemeStyle.background} border-0 shadow-2xl`}>
            <CardHeader className="pb-4">
              <CardTitle className={`text-2xl ${currentThemeStyle.text}`}>
                {pages[currentPage]?.title || `Page ${currentPage + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={pageContentRef}
                className={`prose prose-lg max-w-none ${currentThemeStyle.text}`}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseUp={() => {
                  if (!isMobile) {
                    const selection = window.getSelection()
                    if (selection && selection.toString().trim()) {
                      setSelectedText(selection.toString().trim())
                      const range = selection.getRangeAt(0)
                      const rect = range.getBoundingClientRect()
                      setHighlightMenuPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10,
                      })
                      setShowHighlightMenu(true)
                    }
                  }
                }}
              >
                {renderContent(pages[currentPage]?.content || "")}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              onClick={prevPage}
              disabled={currentPage === 0}
              variant="outline"
              className="flex items-center space-x-2 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Page Indicators */}
            <div className="flex items-center space-x-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageIndex = i
                if (totalPages > 5) {
                  if (currentPage < 3) {
                    pageIndex = i
                  } else if (currentPage > totalPages - 3) {
                    pageIndex = totalPages - 5 + i
                  } else {
                    pageIndex = currentPage - 2 + i
                  }
                }

                return (
                  <Button
                    key={pageIndex}
                    onClick={() => goToPage(pageIndex)}
                    variant={currentPage === pageIndex ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    {pageIndex + 1}
                  </Button>
                )
              })}
            </div>

            <Button
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              variant="outline"
              className="flex items-center space-x-2 bg-transparent"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Reading Stats */}
          {!isFocusMode && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.floor(readingProgress.readingTime / 60)}m
                  </div>
                  <div className="text-sm text-muted-foreground">Reading Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(readingProgress.wordsRead)}</div>
                  <div className="text-sm text-muted-foreground">Words Read</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {highlights.filter((h) => h.pageIndex === currentPage).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Highlights</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{Math.round(readingProgress.progress)}%</div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Highlight Menu */}
      {showHighlightMenu && (
        <div
          className="fixed z-50 bg-white border rounded-lg shadow-lg p-2"
          style={{
            left: highlightMenuPosition.x - 100,
            top: highlightMenuPosition.y - 60,
          }}
        >
          <div className="flex items-center space-x-1 mb-2">
            <Highlighter className="h-4 w-4" />
            <span className="text-sm font-medium">Highlight</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHighlightMenu(false)}
              className="ml-auto h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex space-x-1">
            {highlightColors.map((color) => (
              <Button
                key={color.name}
                onClick={() => addHighlight(color.color)}
                className={`w-6 h-6 p-0 rounded-full ${color.bg} hover:scale-110 transition-transform`}
                style={{ backgroundColor: color.color }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <Dialog open={!!showImageModal} onOpenChange={() => setShowImageModal(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-4">
              <DialogTitle>Image Viewer</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={showImageModal || "/placeholder.svg"}
                alt="Full size"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement("a")
                    link.href = showImageModal
                    link.download = "image"
                    link.click()
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowImageModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Keyboard Shortcuts Help */}
      {isFocusMode && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-sm">
          <div className="space-y-1">
            <div>← → Navigate pages</div>
            <div>Space: Play/Pause</div>
            <div>Esc: Exit focus mode</div>
          </div>
        </div>
      )}
    </div>
  )
}
