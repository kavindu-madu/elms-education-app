"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Note, Question } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, HelpCircle, CheckCircle, XCircle, Trophy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuestionModalProps {
  note: Note
  onBack: () => void
  onExit: () => void
}

export function QuestionModal({ note, onBack, onExit }: QuestionModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [note.id])

  const fetchQuestions = async () => {
    try {
      const q = query(collection(db, "questions"), where("noteId", "==", note.id))
      const snapshot = await getDocs(q)
      const questionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[]

      if (questionsData.length === 0) {
        // Create sample questions if none exist
        const sampleQuestions = await createSampleQuestions()
        setQuestions(sampleQuestions)
      } else {
        setQuestions(questionsData)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createSampleQuestions = async (): Promise<Question[]> => {
    const sampleQuestions = [
      {
        question: "What is the main topic covered in this note?",
        options: [
          "Basic concepts and fundamentals",
          "Advanced applications only",
          "Historical background",
          "Future predictions",
        ],
        correctAnswer: 0,
        explanation: "The note primarily covers basic concepts and fundamental principles.",
        noteId: note.id,
        subjectId: note.subjectId,
        difficulty: "easy" as const,
        createdBy: "system",
        createdAt: new Date(),
      },
      {
        question: "Which key principle is emphasized in the content?",
        options: [
          "Memorization techniques",
          "Understanding core concepts",
          "Speed reading methods",
          "Note-taking strategies",
        ],
        correctAnswer: 1,
        explanation: "The content emphasizes understanding core concepts rather than just memorization.",
        noteId: note.id,
        subjectId: note.subjectId,
        difficulty: "medium" as const,
        createdBy: "system",
        createdAt: new Date(),
      },
    ]

    // Save to Firestore
    const savedQuestions = []
    for (const question of sampleQuestions) {
      const docRef = await addDoc(collection(db, "questions"), {
        ...question,
        createdAt: serverTimestamp(),
      })
      savedQuestions.push({ id: docRef.id, ...question })
    }

    return savedQuestions
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      calculateScore()
    }
  }

  const calculateScore = async () => {
    let correctAnswers = 0
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++
      }
    })

    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    setScore(finalScore)
    setShowResults(true)

    // Save progress
    if (user?.id) {
      try {
        await addDoc(collection(db, "studentProgress"), {
          studentId: user.id,
          noteId: note.id,
          questionsAttempted: questions.length,
          questionsCorrect: correctAnswers,
          score: finalScore,
          completedAt: serverTimestamp(),
        })
      } catch (error) {
        console.error("Error saving progress:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Button>
              <h1 className="text-lg font-semibold">Quiz Results</h1>
              <Button variant="outline" onClick={onExit}>
                Exit
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-center mb-4">
                  {score >= 80 ? (
                    <Trophy className="h-16 w-16 text-yellow-500" />
                  ) : score >= 60 ? (
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-500" />
                  )}
                </div>
                <CardTitle className="text-3xl font-bold">
                  {score >= 80 ? "Excellent!" : score >= 60 ? "Good Job!" : "Keep Practicing!"}
                </CardTitle>
                <CardDescription className="text-lg">You scored {score}% on this quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-6xl font-bold text-primary">{score}%</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedAnswers.filter((answer, index) => answer === questions[index]?.correctAnswer).length}
                    </div>
                    <div className="text-sm text-green-700">Correct</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {questions.length -
                        selectedAnswers.filter((answer, index) => answer === questions[index]?.correctAnswer).length}
                    </div>
                    <div className="text-sm text-red-700">Incorrect</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={onBack} className="bg-gradient-to-r from-blue-500 to-purple-500">
                    Continue Reading
                  </Button>
                  <Button variant="outline" size="lg" onClick={onExit}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Button>
              <h1 className="text-lg font-semibold">Practice Questions</h1>
              <Button variant="outline" onClick={onExit}>
                Exit
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>No Questions Available</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">No practice questions are available for this note yet.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={onBack}>Continue Reading</Button>
                <Button variant="outline" onClick={onExit}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
            <div className="text-center">
              <h1 className="text-lg font-semibold">Practice Quiz</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            <Button variant="outline" onClick={onExit}>
              Exit
            </Button>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="mb-2">
                  {currentQ?.difficulty?.toUpperCase()}
                </Badge>
                <Badge variant="secondary">
                  {currentQuestion + 1}/{questions.length}
                </Badge>
              </div>
              <CardTitle className="text-xl leading-relaxed">{currentQ?.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {currentQ?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswers[currentQuestion] === index ? "default" : "outline"}
                    className="w-full text-left justify-start p-4 h-auto whitespace-normal"
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </Button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={selectedAnswers[currentQuestion] === undefined}
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  {currentQuestion === questions.length - 1 ? "Finish Quiz" : "Next Question"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
