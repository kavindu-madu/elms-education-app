"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Question, Note, Subject } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, HelpCircle, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function QuestionsManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState("all")
  const [formData, setFormData] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    noteId: "",
    subjectId: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [questionsSnapshot, notesSnapshot, subjectsSnapshot] = await Promise.all([
        getDocs(collection(db, "questions")),
        getDocs(collection(db, "notes")),
        getDocs(collection(db, "subjects")),
      ])

      const questionsData = questionsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }) as Question,
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

      const subjectsData = subjectsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }) as Subject,
      )

      setQuestions(questionsData)
      setNotes(notesData)
      setSubjects(subjectsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate options
    const validOptions = formData.options.filter((opt) => opt.trim() !== "")
    if (validOptions.length < 2) {
      toast({
        title: "Invalid options",
        description: "Please provide at least 2 options",
        variant: "destructive",
      })
      return
    }

    if (formData.correctAnswer >= validOptions.length) {
      toast({
        title: "Invalid correct answer",
        description: "Correct answer index is out of range",
        variant: "destructive",
      })
      return
    }

    try {
      const questionData = {
        question: formData.question,
        options: validOptions,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation,
        noteId: formData.noteId,
        subjectId: formData.subjectId,
        difficulty: formData.difficulty,
        createdBy: user.id,
        ...(editingQuestion ? {} : { createdAt: serverTimestamp() }),
      }

      if (editingQuestion) {
        await updateDoc(doc(db, "questions", editingQuestion.id), questionData)
        toast({
          title: "Success",
          description: "Question updated successfully",
        })
      } else {
        await addDoc(collection(db, "questions"), questionData)
        toast({
          title: "Success",
          description: "Question created successfully",
        })
      }

      setDialogOpen(false)
      setEditingQuestion(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving question:", error)
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      noteId: "",
      subjectId: "",
      difficulty: "medium",
    })
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      question: question.question,
      options: [...question.options, "", "", "", ""].slice(0, 4), // Ensure 4 options
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      noteId: question.noteId,
      subjectId: question.subjectId,
      difficulty: question.difficulty,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return

    try {
      await deleteDoc(doc(db, "questions", questionId))
      toast({
        title: "Success",
        description: "Question deleted successfully",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting question:", error)
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      })
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const getNoteName = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    return note ? note.title : "Unknown Note"
  }

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId)
    return subject ? subject.name : "Unknown Subject"
  }

  const filteredQuestions = selectedNoteId === "all" ? questions : questions.filter((q) => q.noteId === selectedNoteId)

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Questions Management</h2>
          <p className="text-muted-foreground">Create and manage practice questions for notes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Create New Question"}</DialogTitle>
              <DialogDescription>
                {editingQuestion
                  ? "Update the question details below."
                  : "Fill in the details to create a new question."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="noteId">Note</Label>
                  <Select
                    value={formData.noteId}
                    onValueChange={(value) => {
                      const selectedNote = notes.find((n) => n.id === value)
                      setFormData({
                        ...formData,
                        noteId: value,
                        subjectId: selectedNote?.subjectId || "",
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select note" />
                    </SelectTrigger>
                    <SelectContent>
                      {notes.map((note) => (
                        <SelectItem key={note.id} value={note.id}>
                          {note.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Enter your question here..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Answer Options</Label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={formData.correctAnswer === index}
                        onChange={() => setFormData({ ...formData, correctAnswer: index })}
                        className="mr-2"
                      />
                      <Label className="font-medium">{String.fromCharCode(65 + index)}.</Label>
                    </div>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingQuestion ? "Update" : "Create"} Question</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by Note */}
      <div className="flex items-center space-x-4">
        <Label htmlFor="note-filter">Filter by Note:</Label>
        <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All notes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All notes</SelectItem>
            {notes.map((note) => (
              <SelectItem key={note.id} value={note.id}>
                {note.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedNoteId !== "all" && (
          <Button variant="outline" size="sm" onClick={() => setSelectedNoteId("all")}>
            Clear Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuestions.map((question) => (
          <Card key={question.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2 flex-1">{question.question}</CardTitle>
                <Badge
                  variant={
                    question.difficulty === "easy"
                      ? "secondary"
                      : question.difficulty === "medium"
                        ? "default"
                        : "destructive"
                  }
                  className="ml-2"
                >
                  {question.difficulty}
                </Badge>
              </div>
              <CardDescription>
                <div className="flex items-center space-x-2 text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{getNoteName(question.noteId)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{getSubjectName(question.subjectId)}</div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Options:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {question.options.map((option, index) => (
                      <li
                        key={index}
                        className={`text-xs ${index === question.correctAnswer ? "text-green-600 font-medium" : ""}`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </li>
                    ))}
                  </ul>
                </div>
                {question.explanation && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Explanation:</strong> {question.explanation}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-1 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(question)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(question.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No questions found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedNoteId
              ? "No questions found for the selected note."
              : "Create your first question to get started."}
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Question
          </Button>
        </div>
      )}
    </div>
  )
}
