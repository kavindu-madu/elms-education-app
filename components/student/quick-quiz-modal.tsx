"use client"

import { useState, useEffect } from "react"
import type { Question, Note, Subject } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle, XCircle, Trophy, Brain, RotateCcw, Timer, Zap, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuizResult {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
  timeSpent: number
}

export function QuickQuizModal({
  noteId,
  subjectId,
  onBack,
  questions,
  notes,
  subjects,
}: {
  noteId?: string
  subjectId?: string
  onBack: () => void
  questions: Question[]
  notes: Note[]
  subjects: Subject[]
}) {
  const { toast } = useToast()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])
  const [results, setResults] = useState<QuizResult[]>([])
  const [isQuizComplete, setIsQuizComplete] = useState(false)
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date())
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes default
  const [showExplanation, setShowExplanation] = useState(false)

  // Filter questions based on noteId or subjectId
  useEffect(() => {
    let filteredQuestions: Question[] = []

    if (noteId) {
      filteredQuestions = questions.filter((q) => q.noteId === noteId)
    } else if (subjectId) {
      filteredQuestions = questions.filter((q) => q.subjectId === subjectId)
    } else {
      // Random questions from all subjects
      filteredQuestions = [...questions]
    }

    // Shuffle and take up to 10 questions
    const shuffled = filteredQuestions.sort(() => Math.random() - 0.5)
    setQuizQuestions(shuffled.slice(0, Math.min(10, shuffled.length)))
    setStartTime(new Date())
    setQuestionStartTime(new Date())
  }, [noteId, subjectId, questions])

  // Timer countdown
  useEffect(() => {
    if (isQuizComplete || quizQuestions.length === 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isQuizComplete, quizQuestions.length])

  const handleTimeUp = () => {
    // Auto-submit current answer or mark as incorrect
    if (currentQuestionIndex < quizQuestions.length) {
      const currentQuestion = quizQuestions[currentQuestionIndex]
      const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)

      const result: QuizResult = {
        questionId: currentQuestion.id,
        selectedAnswer: selectedAnswer || "",
        isCorrect: selectedAnswer === currentQuestion.correctAnswer,
        timeSpent,
      }

      const newResults = [...results, result]
      setResults(newResults)

      // Complete remaining questions as incorrect
      const remainingResults: QuizResult[] = []
      for (let i = currentQuestionIndex + 1; i < quizQuestions.length; i++) {
        remainingResults.push({
          questionId: quizQuestions[i].id,
          selectedAnswer: "",
          isCorrect: false,
          timeSpent: 0,
        })
      }

      setResults([...newResults, ...remainingResults])
      setIsQuizComplete(true)
      toast({ title: "Time's up!", description: "Quiz completed automatically" })
    }
  }

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) {
      toast({ title: "Please select an answer", variant: "destructive" })
      return
    }

    const currentQuestion = quizQuestions[currentQuestionIndex]
    const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer

    const result: QuizResult = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
      timeSpent,
    }

    const newResults = [...results, result]
    setResults(newResults)

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer("")
      setQuestionStartTime(new Date())
      setShowExplanation(false)
    } else {
      setIsQuizComplete(true)
    }

    if (isCorrect) {
      toast({ title: "Correct!", description: "Well done!" })
    } else {
      toast({ title: "Incorrect", description: "Better luck next time!" })
      setShowExplanation(true)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer("")
      setQuestionStartTime(new Date())
      setShowExplanation(false)
    } else {
      setIsQuizComplete(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer("")
    setResults([])
    setIsQuizComplete(false)
    setStartTime(new Date())
    setQuestionStartTime(new Date())
    setTimeRemaining(300)
    setShowExplanation(false)

    // Reshuffle questions
    const shuffled = quizQuestions.sort(() => Math.random() - 0.5)
    setQuizQuestions(shuffled)
  }

  const getQuizTitle = () => {
    if (noteId) {
      const note = notes.find((n) => n.id === noteId)
      return `${note?.title || "Note"} Quiz`
    } else if (subjectId) {
      const subject = subjects.find((s) => s.id === subjectId)
      return `${subject?.name || "Subject"} Quiz`
    }
    return "Random Quiz"
  }

  const calculateScore = () => {
    const correctAnswers = results.filter((r) => r.isCorrect).length
    return Math.round((correctAnswers / results.length) * 100)
  }

  const getTotalTime = () => {
    return Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Excellent! Outstanding performance!"
    if (score >= 80) return "Great job! You're doing well!"
    if (score >= 70) return "Good work! Keep it up!"
    if (score >= 60) return "Not bad! Room for improvement."
    return "Keep studying! You'll get better!"
  }

  if (quizQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">There are no questions available for this selection.</p>
            <Button onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isQuizComplete) {
    const score = calculateScore()
    const totalTime = getTotalTime()
    const correctAnswers = results.filter((r) => r.isCorrect).length

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Quiz Results</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={restartQuiz}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div
                  className={`p-4 rounded-full ${score >= 80 ? "bg-green-100" : score >= 60 ? "bg-yellow-100" : "bg-red-100"}`}
                >
                  <Trophy
                    className={`h-8 w-8 ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600"}`}
                  />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                <span className={getScoreColor(score)}>{score}%</span>
              </CardTitle>
              <p className="text-muted-foreground">{getScoreMessage(score)}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.length - correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{results.length}</div>
                  <div className="text-sm text-muted-foreground">Total Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{formatTime(totalTime)}</div>
                  <div className="text-sm text-muted-foreground">Time Taken</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {quizQuestions.map((question, index) => {
                  const result = results[index]
                  const isCorrect = result?.isCorrect

                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <Badge className={`${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {formatTime(result?.timeSpent || 0)}
                        </Badge>
                      </div>

                      <h3 className="font-medium mb-3">{question.question}</h3>

                      <div className="space-y-2 mb-3">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = result?.selectedAnswer === option
                          const isCorrectAnswer = question.correctAnswer === option

                          return (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded border ${
                                isSelected
                                  ? isCorrectAnswer
                                    ? "bg-green-50 border-green-200"
                                    : "bg-red-50 border-red-200"
                                  : isCorrectAnswer
                                    ? "bg-green-50 border-green-200"
                                    : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                <div className="flex items-center space-x-2">
                                  {isSelected && (
                                    <Badge variant="outline" className="text-xs">
                                      Your Answer
                                    </Badge>
                                  )}
                                  {isCorrectAnswer && <CheckCircle className="h-4 w-4 text-green-600" />}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {question.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <h4 className="font-medium text-blue-800 mb-1">Explanation:</h4>
                          <p className="text-blue-700 text-sm">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentQuestion = quizQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Quiz
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold">{getQuizTitle()}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Timer className="h-4 w-4" />
            <span className={timeRemaining < 60 ? "text-red-600 font-bold" : ""}>{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                <Brain className="h-3 w-3 mr-1" />
                {currentQuestion.difficulty || "Medium"}
              </Badge>
              <Badge variant="secondary">
                <Zap className="h-3 w-3 mr-1" />
                {currentQuestion.points || 10} points
              </Badge>
            </div>
            <CardTitle className="text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            {showExplanation && currentQuestion.explanation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Explanation:</h4>
                <p className="text-blue-700">{currentQuestion.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(currentQuestionIndex - 1)
                setSelectedAnswer(results[currentQuestionIndex - 1]?.selectedAnswer || "")
              }
            }}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          {showExplanation ? (
            <Button onClick={handleNextQuestion}>
              {currentQuestionIndex === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer}>
              Submit Answer
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Quiz Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-green-600">{results.filter((r) => r.isCorrect).length}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-red-600">{results.filter((r) => !r.isCorrect).length}</div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-blue-600">
                {results.length > 0
                  ? Math.round((results.filter((r) => r.isCorrect).length / results.length) * 100)
                  : 0}
                %
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
