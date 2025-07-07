"use client"

import { useState, useEffect } from "react"
import type { Question, Note, Subject } from "@/lib/types"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, XCircle, Clock, Target, Trophy, Brain, RotateCcw, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickQuizModalProps {
  noteId?: string
  subjectId?: string
  onBack: () => void
  questions: Question[]
  notes: Note[]
  subjects: Subject[]
}

export function QuickQuizModal({ noteId, subjectId, onBack, questions, notes, subjects }: QuickQuizModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStartTime, setQuizStartTime] = useState<Date>(new Date())
  const [score, setScore] = useState(0)
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])

  useEffect(() => {
    // Filter and shuffle questions
    let filteredQuestions = questions

    if (noteId) {
      filteredQuestions = questions.filter((q) => q.noteId === noteId)
    } else if (subjectId) {
      filteredQuestions = questions.filter((q) => q.subjectId === subjectId)
    }

    // Shuffle and take up to 10 questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5)
    const selectedQuestions = shuffled.slice(0, Math.min(10, shuffled.length))

    setQuizQuestions(selectedQuestions)
    setSelectedAnswers(new Array(selectedQuestions.length).fill(-1))

    // Set timer for first question
    if (selectedQuestions.length > 0 && selectedQuestions[0].timeLimit) {
      setTimeLeft(selectedQuestions[0].timeLimit)
    }
  }, [noteId, subjectId, questions])

  useEffect(() => {
    // Timer countdown
    if (timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResults && quizQuestions.length > 0) {
      // Auto-advance when time runs out
      handleNextQuestion()
    }
  }, [timeLeft, showResults, quizQuestions.length])

  const currentQuestion = quizQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      // Set timer for next question
      const nextQuestion = quizQuestions[currentQuestionIndex + 1]
      if (nextQuestion.timeLimit) {
        setTimeLeft(nextQuestion.timeLimit)
      }
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = () => {
    // Calculate score
    let correctAnswers = 0
    let totalPoints = 0
    let earnedPoints = 0

    quizQuestions.forEach((question, index) => {
      totalPoints += question.points
      if (selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++
        earnedPoints += question.points
      }
    })

    setScore((earnedPoints / totalPoints) * 100)
    setShowResults(true)

    // Save quiz results
    saveQuizResults(correctAnswers, earnedPoints, totalPoints)

    toast({
      title: "Quiz Completed!",
      description: `You scored ${correctAnswers}/${quizQuestions.length} correct answers`,
    })
  }

  const saveQuizResults = async (correct: number, earned: number, total: number) => {
    if (!user?.id) return

    try {
      const quizResult = {
        userId: user.id,
        noteId: noteId || null,
        subjectId: subjectId || null,
        questionsAttempted: quizQuestions.length,
        questionsCorrect: correct,
        score: (earned / total) * 100,
        timeSpent: Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000),
        completedAt: new Date().toISOString(),
      }

      localStorage.setItem(`quiz_result_${Date.now()}_${user.id}`, JSON.stringify(quizResult))
    } catch (error) {
      console.error("Error saving quiz results:", error)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers(new Array(quizQuestions.length).fill(-1))
    setShowResults(false)
    setQuizStartTime(new Date())
    setScore(0)

    if (quizQuestions[0]?.timeLimit) {
      setTimeLeft(quizQuestions[0].timeLimit)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Trophy className="h-8 w-8 text-yellow-500" />
    if (score >= 60) return <Target className="h-8 w-8 text-blue-500" />
    return <Brain className="h-8 w-8 text-gray-500" />
  }

  if (quizQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-6">
              {noteId ? "This note doesn't have any questions yet." : "No questions found for this subject."}
            </p>
            <Button onClick={onBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showResults) {
    const correctCount = selectedAnswers.filter((answer, index) => answer === quizQuestions[index].correctAnswer).length
    const timeSpent = Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000)

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={onBack} className="hover:bg-blue-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Quiz Results</h1>
            <div className="w-24" /> {/* Spacer */}
          </div>

          {/* Results Summary */}
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mb-6">{getScoreIcon(score)}</div>
              <h2 className={`text-4xl font-bold mb-2 ${getScoreColor(score)}`}>{Math.round(score)}%</h2>
              <p className="text-xl text-muted-foreground mb-6">
                {correctCount} out of {quizQuestions.length} correct
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{correctCount}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{quizQuestions.length - correctCount}</div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                  </div>
                  <div className="text-sm text-muted-foreground">Time Spent</div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={restartQuiz} variant="outline" className="hover:bg-blue-50 bg-transparent">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Quiz
                </Button>
                <Button onClick={onBack} className="bg-gradient-to-r from-blue-500 to-purple-500">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Question Review</h3>
            {quizQuestions.map((question, index) => {
              const userAnswer = selectedAnswers[index]
              const isCorrect = userAnswer === question.correctAnswer

              return (
                <Card
                  key={question.id}
                  className={`border-l-4 ${isCorrect ? "border-l-green-500 bg-green-50" : "border-l-red-500 bg-red-50"}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold text-lg flex-1">{question.question}</h4>
                      <div className="flex items-center space-x-2">
                        {isCorrect ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        <Badge variant={isCorrect ? "default" : "destructive"}>{question.points} pts</Badge>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border ${
                            optionIndex === question.correctAnswer
                              ? "bg-green-100 border-green-300 text-green-800"
                              : optionIndex === userAnswer && !isCorrect
                                ? "bg-red-100 border-red-300 text-red-800"
                                : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span>{option}</span>
                            {optionIndex === question.correctAnswer && (
                              <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                            {optionIndex === userAnswer && !isCorrect && (
                              <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-2">Explanation:</h5>
                        <p className="text-blue-700">{question.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="hover:bg-blue-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Quiz
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold">Quick Quiz</h1>
            <p className="text-sm text-muted-foreground">
              {noteId
                ? notes.find((n) => n.id === noteId)?.title
                : subjectId
                  ? subjects.find((s) => s.id === subjectId)?.name
                  : "Mixed Questions"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {timeLeft > 0 && (
              <div className="flex items-center space-x-2 bg-orange-100 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">{timeLeft}s</span>
              </div>
            )}
            <Badge variant="secondary">
              {currentQuestionIndex + 1} / {quizQuestions.length}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-3 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </Progress>
        </div>

        {/* Question Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge
                  className={`${
                    currentQuestion.difficulty === "easy"
                      ? "bg-green-100 text-green-800"
                      : currentQuestion.difficulty === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="outline">{currentQuestion.points} points</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  variant={selectedAnswers[currentQuestionIndex] === index ? "default" : "outline"}
                  className={`w-full text-left justify-start p-4 h-auto ${
                    selectedAnswers[currentQuestionIndex] === index
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "hover:bg-blue-50"
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-lg">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-base">{option}</span>
                  </div>
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="hover:bg-gray-50"
              >
                Previous
              </Button>

              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswers[currentQuestionIndex] === -1}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {currentQuestionIndex === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Navigation */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2 flex-wrap">
              {quizQuestions.map((_, index) => (
                <Button
                  key={index}
                  variant={
                    index === currentQuestionIndex ? "default" : selectedAnswers[index] !== -1 ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-full ${
                    index === currentQuestionIndex
                      ? "bg-gradient-to-r from-blue-500 to-purple-500"
                      : selectedAnswers[index] !== -1
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "hover:bg-blue-50"
                  }`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
