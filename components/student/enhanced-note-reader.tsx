"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Note, Subject, Category, Highlight, NoteImage } from "@/lib/types"
import { useAuth } from "@/components/providers/auth-provider"
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkPlus,
  Settings,
  Play,
  Pause,
  Highlighter,
  BookOpen,
  Clock,
  Target,
  Trash2,
  X,
  MoreVertical,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Palette,
  Type,
  ImageIcon,
  ZoomIn,
  Download,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { QuestionModal } from "./question-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface EnhancedNoteReaderProps {
  note: Note
  onBack: () => void
  subjects: Subject[]
  categories: Category[]
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a", bg: "bg-yellow-200", border: "border-yellow-400", icon: "🟡" },
  { name: "Green", value: "#bbf7d0", bg: "bg-green-200", border: "border-green-400", icon: "🟢" },
  { name: "Blue", value: "#bfdbfe", bg: "bg-blue-200", border: "border-blue-400", icon: "🔵" },
  { name: "Pink", value: "#fbcfe8", bg: "bg-pink-200", border: "border-pink-400", icon: "🩷" },
  { name: "Purple", value: "#e9d5ff", bg: "bg-purple-200", border: "border-purple-400", icon: "🟣" },
  { name: "Orange", value: "#fed7aa", bg: "bg-orange-200", border: "border-orange-400", icon: "🟠" },
]

const READING_THEMES = {
  classic: {
    name: "Classic Book",
    bg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
    paper: "bg-gradient-to-br from-yellow-50 to-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
    shadow: "shadow-amber-100",
    icon: "📖",
  },
  modern: {
    name: "Modern White",
    bg: "bg-gradient-to-br from-gray-50 to-white",
    paper: "bg-white",
    text: "text-gray-800",
    border: "border-gray-200",
    shadow: "shadow-gray-100",
    icon: "📄",
  },
  dark: {
    name: "Night Mode",
    bg: "bg-gradient-to-br from-gray-900 to-black",
    paper: "bg-gray-800",
    text: "text-gray-100",
    border: "border-gray-700",
    shadow: "shadow-gray-800",
    icon: "🌙",
  },
  sepia: {
    name: "Sepia Vintage",
    bg: "bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100",
    paper: "bg-gradient-to-br from-amber-100 to-yellow-100",
    text: "text-amber-800",
    border: "border-amber-300",
    shadow: "shadow-amber-200",
    icon: "📜",
  },
}

export function EnhancedNoteReader({ note, onBack, subjects, categories }: EnhancedNoteReaderProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(0)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [showQuestions, setShowQuestions] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [readingTheme, setReadingTheme] = useState<keyof typeof READING_THEMES>("classic")
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [isReading, setIsReading] = useState(false)
  const [readingSpeed, setReadingSpeed] = useState(150)
  const [readingTime, setReadingTime] = useState(0)
  const [wordsRead, setWordsRead] = useState(0)
  const [focusMode, setFocusMode] = useState(false)
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [currentSpeakingWord, setCurrentSpeakingWord] = useState<string>("")
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileHighlights, setShowMobileHighlights] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  })
  const [selectionRange, setSelectionRange] = useState<Range | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [selectedImage, setSelectedImage] = useState<NoteImage | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const speechSynthesis = useRef<SpeechSynthesis | null>(null)
  const readingTimer = useRef<NodeJS.Timeout | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

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
  const currentTheme = READING_THEMES[readingTheme]

  const subject = subjects.find((s) => s.id === note.subjectId)
  const category = categories.find((c) => c.id === note.categoryId)

  const minSwipeDistance = 50

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    loadUserData()
    speechSynthesis.current = window.speechSynthesis

    // Hide context menu on click outside
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ x: 0, y: 0, show: false })
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      if (readingTimer.current) {
        clearInterval(readingTimer.current)
      }
      if (speechSynthesis.current && utteranceRef.current) {
        speechSynthesis.current.cancel()
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [note.id, user?.id])

  useEffect(() => {
    // Save reading progress and update reading time
    if (user?.id) {
      const progressData = {
        noteId: note.id,
        currentPage,
        progress: Math.round(progress),
        lastRead: new Date().toISOString(),
        readingTime,
        wordsRead,
        theme: readingTheme,
        fontSize,
        lineHeight,
      }
      localStorage.setItem(`reading_progress_${note.id}_${user.id}`, JSON.stringify(progressData))
      updateReadingStats()
    }
  }, [currentPage, note.id, user?.id, progress, readingTime, wordsRead])

  useEffect(() => {
    // Start reading timer when reading
    if (isReading && readingTimer.current === null) {
      readingTimer.current = setInterval(() => {
        setReadingTime((prev) => prev + 1)
        setWordsRead((prev) => prev + readingSpeed / 60)
      }, 1000)
    } else if (!isReading && readingTimer.current) {
      clearInterval(readingTimer.current)
      readingTimer.current = null
    }

    return () => {
      if (readingTimer.current) {
        clearInterval(readingTimer.current)
        readingTimer.current = null
      }
    }
  }, [isReading, readingSpeed])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        if (focusMode) {
          nextPage()
        } else {
          nextPage()
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault()
        prevPage()
      } else if (e.code === "ArrowRight") {
        e.preventDefault()
        nextPage()
      } else if (e.code === "Escape") {
        if (focusMode) {
          setFocusMode(false)
        } else if (contextMenu.show) {
          setContextMenu({ x: 0, y: 0, show: false })
        }
      } else if (e.code === "KeyF" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setFocusMode(!focusMode)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage, totalPages, focusMode, contextMenu.show])

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

      // Load reading progress and settings
      const savedProgress = localStorage.getItem(`reading_progress_${note.id}_${user.id}`)
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress)
        setCurrentPage(progressData.currentPage || 0)
        setReadingProgress(progressData.progress || 0)
        setReadingTime(progressData.readingTime || 0)
        setWordsRead(progressData.wordsRead || 0)
        setReadingTheme(progressData.theme || "classic")
        setFontSize(progressData.fontSize || (isMobile ? 18 : 16))
        setLineHeight(progressData.lineHeight || (isMobile ? 1.8 : 1.6))
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

  const updateReadingStats = async () => {
    if (!user?.id) return

    try {
      const statsRef = doc(db, "readingStats", `${user.id}_${note.id}`)
      await setDoc(
        statsRef,
        {
          userId: user.id,
          noteId: note.id,
          totalReadingTime: readingTime,
          wordsRead,
          pagesRead: currentPage + 1,
          lastRead: new Date(),
          progress: Math.round(progress),
        },
        { merge: true },
      )
    } catch (error) {
      console.error("Error updating reading stats:", error)
    }
  }

  // Enhanced text selection for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setIsLongPress(false)

    // Start long press timer
    const timer = setTimeout(() => {
      setIsLongPress(true)
      // Trigger text selection on long press
      const selection = window.getSelection()
      if (selection) {
        const range = document.caretRangeFromPoint(touch.clientX, touch.clientY)
        if (range) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }, 500)

    longPressTimerRef.current = timer
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })

    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Handle text selection if it was a long press
    if (isLongPress) {
      handleTextSelection()
      return
    }

    // Handle swipe navigation
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance

    // Only handle horizontal swipes if they're more significant than vertical
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && currentPage < totalPages - 1) {
        nextPage()
      } else if (isRightSwipe && currentPage > 0) {
        prevPage()
      }
    }
  }

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim()
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      setSelectedText(selectedText)
      setSelectionRange(range)

      // Position context menu
      const x = Math.min(rect.left + rect.width / 2, window.innerWidth - 200)
      const y = rect.top - 60

      setContextMenu({
        x: Math.max(10, x),
        y: Math.max(10, y),
        show: true,
      })

      // Provide haptic feedback on mobile
      if (isMobile && "vibrate" in navigator) {
        navigator.vibrate(50)
      }
    }
  }, [isMobile])

  const handleHighlight = async (color: string) => {
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
      color: color,
      createdAt: new Date(),
      note: `Page ${currentPage + 1}`,
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
    setContextMenu({ x: 0, y: 0, show: false })
    window.getSelection()?.removeAllRanges()
  }

  const removeHighlight = async (highlightId: string) => {
    const updatedHighlights = highlights.filter((h) => h.id !== highlightId)
    setHighlights(updatedHighlights)
    localStorage.setItem(`highlights_${note.id}_${user.id}`, JSON.stringify(updatedHighlights))

    toast({
      title: "Highlight removed",
      description: "The highlight has been deleted",
    })
  }

  const toggleBookmark = async () => {
    if (!user?.id) return

    try {
      const userDocRef = doc(db, "users", user.id)

      if (isBookmarked) {
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
        if (contentRef.current) {
          contentRef.current.scrollTop = 0
        }
      }, 300)
    } else if (autoAdvance) {
      setShowQuestions(true)
    } else {
      setShowQuestions(true)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentPage(currentPage - 1)
        setIsAnimating(false)
        if (contentRef.current) {
          contentRef.current.scrollTop = 0
        }
      }, 300)
    }
  }

  const startTextToSpeech = () => {
    if (!speechSynthesis.current) return

    const text = pages[currentPage]?.content || ""
    const words = text.split(/\s+/)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = readingSpeed / 200
    utterance.pitch = 1
    utterance.volume = isMuted ? 0 : 0.8

    let wordIndex = 0

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        setCurrentSpeakingIndex(wordIndex)
        setCurrentSpeakingWord(words[wordIndex] || "")
        wordIndex++
      }
    }

    utterance.onstart = () => {
      setIsReading(true)
      setCurrentSpeakingIndex(0)
    }

    utterance.onend = () => {
      setIsReading(false)
      setCurrentSpeakingIndex(-1)
      setCurrentSpeakingWord("")
      if (autoAdvance && currentPage < totalPages - 1) {
        setTimeout(() => nextPage(), 1000)
      }
    }

    utterance.onerror = () => {
      setIsReading(false)
      setCurrentSpeakingIndex(-1)
      setCurrentSpeakingWord("")
    }

    utteranceRef.current = utterance
    speechSynthesis.current.speak(utterance)
  }

  const stopTextToSpeech = () => {
    if (speechSynthesis.current && utteranceRef.current) {
      speechSynthesis.current.cancel()
      setIsReading(false)
      setCurrentSpeakingIndex(-1)
      setCurrentSpeakingWord("")
    }
  }

  const renderContent = (content: string) => {
    let renderedContent = content
    const currentPageData = pages[currentPage]

    // Apply highlights
    highlights.forEach((highlight) => {
      if (renderedContent.includes(highlight.text)) {
        const highlightedText = `<mark class="highlight-text cursor-pointer transition-all duration-200 hover:shadow-lg" style="background-color: ${highlight.color}; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 3px solid ${highlight.color};" data-highlight-id="${highlight.id}">${highlight.text}</mark>`
        renderedContent = renderedContent.replace(
          new RegExp(highlight.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          highlightedText,
        )
      }
    })

    // Apply speaking highlight
    if (isReading && currentSpeakingWord) {
      const speakingHighlight = `<span class="speaking-word bg-blue-300 animate-pulse px-2 py-1 rounded-md shadow-sm font-medium">${currentSpeakingWord}</span>`
      renderedContent = renderedContent.replace(
        new RegExp(`\\b${currentSpeakingWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
        speakingHighlight,
      )
    }

    // Enhanced markdown rendering with image support
    renderedContent = renderedContent
      .replace(
        /^# (.*$)/gm,
        '<h1 class="text-2xl md:text-3xl font-bold mb-4 md:mb-6 mt-6 md:mt-8 text-blue-800">$1</h1>',
      )
      .replace(
        /^## (.*$)/gm,
        '<h2 class="text-xl md:text-2xl font-semibold mb-3 md:mb-4 mt-4 md:mt-6 text-blue-700">$1</h2>',
      )
      .replace(
        /^### (.*$)/gm,
        '<h3 class="text-lg md:text-xl font-medium mb-2 md:mb-3 mt-3 md:mt-4 text-blue-600">$1</h3>',
      )
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
      .replace(
        /^- (.*$)/gm,
        '<li class="ml-4 mb-2 flex items-start"><span class="text-blue-500 mr-2">•</span><span>$1</span></li>',
      )
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-2 list-decimal">$1</li>')
      .replace(/!\[([^\]]*)\]$$([^)]+)$$/g, (match, alt, url) => {
        return `<div class="my-6 text-center">
          <img src="${url}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200" onclick="window.openImageModal('${url}', '${alt}')" />
          ${alt ? `<p class="text-sm text-gray-600 mt-2 italic">${alt}</p>` : ""}
        </div>`
      })
      .replace(/\n\n/g, '</p><p class="mb-3 md:mb-4">')
      .replace(/\n/g, "<br>")

    // Add images from page data
    let contentWithImages = renderedContent
    if (currentPageData?.images) {
      currentPageData.images.forEach((image) => {
        const imageHtml = `<div class="my-6 text-center">
          <img src="${image.url}" alt="${image.alt}" class="max-w-full h-auto rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200" onclick="window.openImageModal('${image.url}', '${image.alt}')" />
          ${image.caption ? `<p class="text-sm text-gray-600 mt-2 italic">${image.caption}</p>` : ""}
        </div>`

        if (image.position === "top") {
          contentWithImages = imageHtml + contentWithImages
        } else if (image.position === "bottom") {
          contentWithImages = contentWithImages + imageHtml
        } else if (image.position === "middle") {
          const midPoint = Math.floor(contentWithImages.length / 2)
          contentWithImages = contentWithImages.slice(0, midPoint) + imageHtml + contentWithImages.slice(midPoint)
        }
      })
    }

    return { __html: `<div class="mb-4">${contentWithImages}</div>` }
  }

  // Global function for opening image modal
  useEffect(() => {
    ;(window as any).openImageModal = (url: string, alt: string) => {
      setSelectedImage({ id: Date.now().toString(), url, alt, position: "inline" })
    }

    return () => {
      delete (window as any).openImageModal
    }
  }, [])

  if (showQuestions) {
    return <QuestionModal note={note} onBack={() => setShowQuestions(false)} onExit={onBack} />
  }

  return (
    <div
      className={`${focusMode ? "fixed inset-0 z-50" : "min-h-screen"} transition-all duration-500 ${currentTheme.bg}`}
    >
      {/* Context Menu for Text Selection */}
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-2 min-w-[200px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <div className="text-xs font-medium text-gray-600 mb-2 px-2">Highlight with:</div>
          <div className="grid grid-cols-3 gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <Button
                key={color.value}
                variant="outline"
                size="sm"
                onClick={() => handleHighlight(color.value)}
                className={`${color.bg} ${color.border} hover:scale-105 transition-all duration-200 p-2 h-auto flex flex-col items-center gap-1`}
              >
                <span className="text-lg">{color.icon}</span>
                <span className="text-xs">{color.name}</span>
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setContextMenu({ x: 0, y: 0, show: false })}
            className="w-full mt-2 text-gray-500"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  {selectedImage.alt || "Image"}
                </span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(selectedImage.url, "_blank")}>
                    <ZoomIn className="h-4 w-4 mr-2" />
                    Full Size
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement("a")
                      link.href = selectedImage.url
                      link.download = selectedImage.alt || "image"
                      link.click()
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              <img
                src={selectedImage.url || "/placeholder.svg"}
                alt={selectedImage.alt}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Header */}
      {!focusMode && (
        <header className={`border-b ${currentTheme.border} bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm`}>
          <div className="px-3 md:px-4 py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={onBack} size="sm" className="hover:bg-blue-50">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="text-center flex-1 mx-2">
                <h1 className={`text-sm md:text-lg font-semibold line-clamp-1 ${currentTheme.text}`}>{note.title}</h1>
                <div className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {subject?.name}
                  </Badge>
                  <span>•</span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(readingTime / 60)}:{(readingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {/* Quick Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusMode(true)}
                  className="hover:bg-purple-50 bg-transparent"
                >
                  <Maximize className="h-4 w-4" />
                </Button>

                {/* Mobile Menu */}
                {isMobile ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Reading Options
                        </SheetTitle>
                        <SheetDescription>Customize your reading experience</SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6 mt-6">
                        {/* Audio Controls */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            Audio Controls
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={isReading ? stopTextToSpeech : startTextToSpeech}
                              className="flex-1 bg-transparent"
                            >
                              {isReading ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                              {isReading ? "Pause" : "Play"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsMuted(!isMuted)}
                              className={isMuted ? "bg-red-100 text-red-700" : ""}
                            >
                              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Auto Advance</Label>
                            <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Navigation
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" onClick={prevPage} disabled={currentPage === 0} size="sm">
                              <SkipBack className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={toggleBookmark}
                              className={isBookmarked ? "bg-yellow-100 text-yellow-700" : ""}
                              size="sm"
                            >
                              {isBookmarked ? (
                                <Bookmark className="h-4 w-4 fill-current" />
                              ) : (
                                <BookmarkPlus className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={nextPage}
                              disabled={currentPage === totalPages - 1}
                              size="sm"
                            >
                              <SkipForward className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Highlights */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Highlights
                          </h4>
                          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                            💡 <strong>Tip:</strong> Long press on any text to highlight it with colors!
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMobileHighlights(!showMobileHighlights)}
                            className="w-full"
                          >
                            <Highlighter className="h-4 w-4 mr-2" />
                            View Highlights ({highlights.length})
                          </Button>
                        </div>

                        {/* Theme Settings */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Theme
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(READING_THEMES).map(([key, theme]) => (
                              <Button
                                key={key}
                                variant={readingTheme === key ? "default" : "outline"}
                                size="sm"
                                onClick={() => setReadingTheme(key as keyof typeof READING_THEMES)}
                                className="text-xs flex items-center gap-1"
                              >
                                <span>{theme.icon}</span>
                                {theme.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Typography Settings */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Type className="h-4 w-4" />
                            Typography
                          </h4>
                          <div>
                            <Label className="text-sm">Font Size: {fontSize}px</Label>
                            <Slider
                              value={[fontSize]}
                              onValueChange={(value) => setFontSize(value[0])}
                              max={28}
                              min={14}
                              step={1}
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label className="text-sm">Line Height: {lineHeight}</Label>
                            <Slider
                              value={[lineHeight]}
                              onValueChange={(value) => setLineHeight(value[0])}
                              max={2.5}
                              min={1.2}
                              step={0.1}
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label className="text-sm">Reading Speed: {readingSpeed} WPM</Label>
                            <Slider
                              value={[readingSpeed]}
                              onValueChange={(value) => setReadingSpeed(value[0])}
                              max={300}
                              min={100}
                              step={25}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  // Desktop controls
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isReading ? stopTextToSpeech : startTextToSpeech}
                      className="hover:bg-green-50 bg-transparent"
                    >
                      {isReading ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="hover:bg-gray-50 bg-transparent">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium mb-3">Reading Settings</h4>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm">Theme</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {Object.entries(READING_THEMES).map(([key, theme]) => (
                                    <Button
                                      key={key}
                                      variant={readingTheme === key ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setReadingTheme(key as keyof typeof READING_THEMES)}
                                      className="justify-start"
                                    >
                                      <span className="mr-2">{theme.icon}</span>
                                      {theme.name}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm">Font Size: {fontSize}px</Label>
                                <Slider
                                  value={[fontSize]}
                                  onValueChange={(value) => setFontSize(value[0])}
                                  max={24}
                                  min={12}
                                  step={1}
                                  className="mt-2"
                                />
                              </div>

                              <div>
                                <Label className="text-sm">Line Height: {lineHeight}</Label>
                                <Slider
                                  value={[lineHeight]}
                                  onValueChange={(value) => setLineHeight(value[0])}
                                  max={2.5}
                                  min={1.2}
                                  step={0.1}
                                  className="mt-2"
                                />
                              </div>

                              <div>
                                <Label className="text-sm">Reading Speed: {readingSpeed} WPM</Label>
                                <Slider
                                  value={[readingSpeed]}
                                  onValueChange={(value) => setReadingSpeed(value[0])}
                                  max={300}
                                  min={100}
                                  step={25}
                                  className="mt-2"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Auto Advance</Label>
                                <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleBookmark}
                      className={isBookmarked ? "bg-yellow-100 text-yellow-700" : "hover:bg-yellow-50"}
                    >
                      {isBookmarked ? (
                        <Bookmark className="h-4 w-4 fill-current" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground mb-2">
                <span className="flex items-center space-x-1">
                  <BookOpen className="h-3 md:h-4 w-3 md:w-4" />
                  <span>
                    Page {currentPage + 1} of {totalPages}
                  </span>
                </span>
                <div className="flex items-center space-x-2 md:space-x-4">
                  <span className="flex items-center space-x-1">
                    <Target className="h-3 md:h-4 w-3 md:w-4" />
                    <span>{Math.round(progress)}%</span>
                  </span>
                  {!isMobile && <span>{Math.round(wordsRead)} words</span>}
                </div>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-2 md:h-3 bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-lg"
                    style={{ width: `${progress}%` }}
                  />
                </Progress>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Focus Mode Controls */}
      {focusMode && (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusMode(false)}
              className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
            >
              <Minimize className="h-4 w-4 mr-2" />
              Exit Focus
            </Button>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
              <span className="text-sm font-medium">
                Page {currentPage + 1} of {totalPages}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={isReading ? stopTextToSpeech : startTextToSpeech}
              className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
            >
              {isReading ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`${focusMode ? "p-4 pt-20" : "px-3 md:px-4 py-4 md:py-8"}`}>
        <div className="max-w-4xl mx-auto">
          {/* Book-like Card */}
          <Card
            className={`${focusMode ? "min-h-[calc(100vh-6rem)]" : "min-h-[60vh] md:min-h-[700px]"} transition-all duration-500 ${currentTheme.shadow} ${currentTheme.border} border ${isAnimating ? "book-page page-flip" : ""}`}
            style={{
              boxShadow:
                focusMode || isMobile
                  ? "none"
                  : `
                0 1px 3px rgba(0,0,0,0.12),
                0 1px 2px rgba(0,0,0,0.24),
                inset 0 0 0 1px rgba(255,255,255,0.1),
                0 20px 40px rgba(0,0,0,0.1)
              `,
              transform: focusMode || isMobile ? "none" : "perspective(1000px) rotateX(2deg)",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <CardContent
              className={`p-4 md:p-12 ${currentTheme.paper} ${focusMode ? "min-h-[calc(100vh-6rem)]" : "min-h-[60vh] md:min-h-[700px]"} relative overflow-hidden`}
            >
              {/* Page corner fold effect (desktop only) */}
              {!focusMode && !isMobile && (
                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-gray-200 to-transparent opacity-30 pointer-events-none" />
              )}

              {/* Content */}
              <div
                ref={contentRef}
                className={`prose prose-sm md:prose-lg max-w-none ${currentTheme.text} leading-relaxed overflow-y-auto ${focusMode ? "max-h-[calc(100vh-10rem)]" : "max-h-[50vh] md:max-h-[600px]"}`}
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={renderContent(pages[currentPage]?.content || "")}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  fontFamily: "'Crimson Text', 'Georgia', serif",
                  textAlign: "justify",
                }}
              />

              {/* Page number */}
              <div
                className={`absolute bottom-4 md:bottom-6 right-4 md:right-6 text-sm ${currentTheme.text} opacity-60`}
              >
                {currentPage + 1}
              </div>
            </CardContent>
          </Card>

          {/* Mobile Navigation */}
          {isMobile && !focusMode && (
            <div className="flex items-center justify-between mt-4 px-2">
              <Button
                variant="outline"
                onClick={prevPage}
                disabled={currentPage === 0}
                className="flex items-center space-x-2 px-4 py-2 disabled:opacity-50 bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageIndex = Math.max(0, Math.min(currentPage - 2, totalPages - 5)) + i
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
                          if (contentRef.current) {
                            contentRef.current.scrollTop = 0
                          }
                        }, 300)
                      }}
                      className={`w-8 h-8 rounded-full transition-all duration-200 ${
                        pageIndex === currentPage
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                          : "hover:bg-blue-50"
                      }`}
                    >
                      {pageIndex + 1}
                    </Button>
                  )
                })}
              </div>

              <Button
                onClick={nextPage}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <span>{currentPage === totalPages - 1 ? "Finish" : "Next"}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Desktop Navigation */}
          {!isMobile && !focusMode && (
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevPage}
                disabled={currentPage === 0}
                className={`flex items-center space-x-2 px-6 py-3 ${currentTheme.paper} backdrop-blur-sm hover:bg-blue-50 disabled:opacity-50 shadow-lg transition-all duration-200 hover:scale-105`}
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Previous</span>
              </Button>

              {/* Page indicators */}
              <div className="flex items-center space-x-2">
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
                          if (contentRef.current) {
                            contentRef.current.scrollTop = 0
                          }
                        }, 300)
                      }}
                      className={`w-12 h-12 rounded-full transition-all duration-200 ${
                        pageIndex === currentPage
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-110"
                          : `${currentTheme.paper} backdrop-blur-sm hover:bg-blue-50 shadow-md hover:scale-105`
                      }`}
                    >
                      {pageIndex + 1}
                    </Button>
                  )
                })}
              </div>

              <Button
                onClick={nextPage}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg transition-all duration-200 hover:scale-105"
              >
                <span>{currentPage === totalPages - 1 ? "Finish Reading" : "Next"}</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Mobile Highlights Panel */}
          {showMobileHighlights && isMobile && (
            <Card className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center text-yellow-800">
                    <Highlighter className="h-4 w-4 mr-2" />
                    Highlights ({highlights.length})
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowMobileHighlights(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="p-2 rounded border-l-4 text-sm"
                      style={{
                        backgroundColor: highlight.color + "20",
                        borderLeftColor: highlight.color,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-xs">{highlight.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {highlight.note} • {highlight.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHighlight(highlight.id)}
                          className="hover:bg-red-50 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Reading Stats */}
          {!focusMode && !isMobile && (
            <Card className="mt-8 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.floor(readingTime / 60)}m {readingTime % 60}s
                    </div>
                    <div className="text-sm text-muted-foreground">Reading Time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{Math.round(wordsRead)}</div>
                    <div className="text-sm text-muted-foreground">Words Read</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{highlights.length}</div>
                    <div className="text-sm text-muted-foreground">Highlights</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{Math.round(readingSpeed)}</div>
                    <div className="text-sm text-muted-foreground">WPM</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Enhanced Highlights Panel */}
          {highlights.length > 0 && !focusMode && !isMobile && (
            <Card className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center text-yellow-800">
                    <Highlighter className="h-5 w-5 mr-2" />
                    Your Highlights ({highlights.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="p-4 rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md group"
                      style={{
                        backgroundColor: highlight.color + "20",
                        borderLeftColor: highlight.color,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 mb-1">{highlight.text}</p>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: highlight.color }} />
                            {highlight.note} • {highlight.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHighlight(highlight.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
