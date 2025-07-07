"use client"

import type React from "react"

import { useState } from "react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, HelpCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JsonUploadModalProps {
  onSuccess?: () => void
}

export function JsonUploadModal({ onSuccess }: JsonUploadModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jsonContent, setJsonContent] = useState("")
  const [uploadType, setUploadType] = useState<"notes" | "questions">("notes")

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonContent(content)
      }
      reader.readAsText(file)
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a valid JSON file",
        variant: "destructive",
      })
    }
  }

  const validateNotesJson = (data: any[]): boolean => {
    return data.every((item) => {
      const hasBasic =
        typeof item.title === "string" && typeof item.subjectId === "string" && typeof item.categoryId === "string"

      const hasLegacyContent = typeof item.content === "string" && item.content.trim().length > 0

      const hasPages =
        Array.isArray(item.pages) &&
        item.pages.length > 0 &&
        item.pages.every(
          (p: any) => typeof p.pageNumber === "number" && typeof p.content === "string" && p.content.trim().length > 0,
        )

      // Accept the note if it has the basics AND (legacy content OR pages array)
      return hasBasic && (hasLegacyContent || hasPages)
    })
  }

  const validateQuestionsJson = (data: any[]): boolean => {
    return data.every(
      (item) =>
        item.question &&
        item.options &&
        Array.isArray(item.options) &&
        item.options.length >= 2 &&
        typeof item.correctAnswer === "number" &&
        item.correctAnswer >= 0 &&
        item.correctAnswer < item.options.length &&
        item.noteId &&
        item.subjectId,
    )
  }

  const handleUpload = async () => {
    if (!jsonContent.trim()) {
      toast({
        title: "No content",
        description: "Please upload a JSON file or paste JSON content",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const data = JSON.parse(jsonContent)

      if (!Array.isArray(data)) {
        throw new Error("JSON must be an array of objects")
      }

      if (uploadType === "notes") {
        if (!validateNotesJson(data)) {
          throw new Error("Invalid notes format. Each note must have title, content, subjectId, and categoryId")
        }

        // Upload notes
        for (const item of data) {
          const pages: any[] =
            item.pages && Array.isArray(item.pages) && item.pages.length
              ? item.pages.map((p: any, idx: number) => ({
                  id: p.id || `${idx + 1}`,
                  pageNumber: p.pageNumber ?? idx + 1,
                  content: p.content,
                  highlights: p.highlights ?? [],
                }))
              : [
                  {
                    id: "1",
                    pageNumber: 1,
                    content: item.content,
                    highlights: [],
                  },
                ]

          const note = {
            title: item.title,
            titleEn: item.titleEn || item.title,
            titleSi: item.titleSi || "",
            content: pages[0].content, // keep for backward compatibility
            subjectId: item.subjectId,
            categoryId: item.categoryId,
            pages,
            assignedStudents: item.assignedStudents || [],
            createdBy: user?.id || "admin",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          await addDoc(collection(db, "notes"), note)
        }

        toast({
          title: "Success!",
          description: `${data.length} notes uploaded successfully`,
        })
      } else {
        if (!validateQuestionsJson(data)) {
          throw new Error(
            "Invalid questions format. Each question must have question, options array, correctAnswer number, noteId, and subjectId",
          )
        }

        // Upload questions
        for (const questionData of data) {
          const question = {
            question: questionData.question,
            options: questionData.options,
            correctAnswer: questionData.correctAnswer,
            explanation: questionData.explanation || "",
            noteId: questionData.noteId,
            subjectId: questionData.subjectId,
            difficulty: questionData.difficulty || "medium",
            assignedStudents: questionData.assignedStudents || [],
            createdBy: user?.id || "admin",
            createdAt: serverTimestamp(),
          }

          await addDoc(collection(db, "questions"), question)
        }

        toast({
          title: "Success!",
          description: `${data.length} questions uploaded successfully`,
        })
      }

      setOpen(false)
      setJsonContent("")
      onSuccess?.()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to parse or upload JSON data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const notesExample = `[
  {
    "title": "Introduction to Physics",
    "titleEn": "Introduction to Physics",
    "titleSi": "භෞතික විද්‍යාවට හැඳින්වීම",
    "content": "# Physics Basics\\n\\nPhysics is the study of matter and energy...",
    "subjectId": "your-subject-id",
    "categoryId": "your-category-id",
    "pages": [
      {
        "id": "1",
        "pageNumber": 1,
        "content": "Page 1 content here...",
        "highlights": []
      }
    ],
    "assignedStudents": []
  }
]`

  const questionsExample = `[
  {
    "question": "What is the speed of light?",
    "options": [
      "299,792,458 m/s",
      "300,000,000 m/s", 
      "299,000,000 m/s",
      "298,000,000 m/s"
    ],
    "correctAnswer": 0,
    "explanation": "The speed of light in vacuum is exactly 299,792,458 meters per second.",
    "noteId": "your-note-id",
    "subjectId": "your-subject-id",
    "difficulty": "medium"
  }
]`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-green-500 to-blue-500 text-white border-0 hover:from-green-600 hover:to-blue-600"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Bulk Upload via JSON
          </DialogTitle>
          <DialogDescription>Upload multiple notes or questions using JSON format</DialogDescription>
        </DialogHeader>

        <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as "notes" | "questions")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center">
              <HelpCircle className="h-4 w-4 mr-2" />
              Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes-file">Upload JSON File</Label>
                <Input id="notes-file" type="file" accept=".json" onChange={handleFileUpload} className="mt-1" />
              </div>

              <div className="text-center text-muted-foreground">or</div>

              <div>
                <Label htmlFor="notes-json">Paste JSON Content</Label>
                <Textarea
                  id="notes-json"
                  placeholder="Paste your JSON content here..."
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  rows={10}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Notes JSON Format Example:</strong>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{notesExample}</pre>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="questions-file">Upload JSON File</Label>
                <Input id="questions-file" type="file" accept=".json" onChange={handleFileUpload} className="mt-1" />
              </div>

              <div className="text-center text-muted-foreground">or</div>

              <div>
                <Label htmlFor="questions-json">Paste JSON Content</Label>
                <Textarea
                  id="questions-json"
                  placeholder="Paste your JSON content here..."
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  rows={10}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Questions JSON Format Example:</strong>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{questionsExample}</pre>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={loading || !jsonContent.trim()}>
            {loading ? (
              <>
                <div className="loading-spinner mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {uploadType}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
