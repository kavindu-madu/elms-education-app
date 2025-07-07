"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Note, Subject, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  Download,
  FileText,
  ImageIcon,
  Link,
  Target,
  Clock,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MultiPageNoteEditor } from "./multi-page-note-editor"
import { JsonUploadModal } from "./json-upload-modal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function NotesManager() {
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isJsonUploadOpen, setIsJsonUploadOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    titleEn: "",
    titleSi: "",
    content: "",
    subjectId: "",
    categoryId: "",
    thumbnail: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    estimatedReadTime: 5,
    tags: "",
    assignedStudents: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [notesSnapshot, subjectsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "notes"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "categories")),
      ])

      const notesData = notesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Note[]

      const subjectsData = subjectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Subject[]

      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Category[]

      setNotes(notesData)
      setSubjects(subjectsData)
      setCategories(categoriesData)
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

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.titleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.titleSi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesSubject = selectedSubject === "all" || note.subjectId === selectedSubject
    const matchesCategory = selectedCategory === "all" || note.categoryId === selectedCategory

    return matchesSearch && matchesSubject && matchesCategory
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.subjectId || !formData.categoryId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const noteData = {
        title: formData.title,
        titleEn: formData.titleEn || formData.title,
        titleSi: formData.titleSi || formData.title,
        content: formData.content,
        subjectId: formData.subjectId,
        categoryId: formData.categoryId,
        thumbnail: formData.thumbnail || "",
        difficulty: formData.difficulty,
        estimatedReadTime: formData.estimatedReadTime,
        tags: formData.tags ? formData.tags.split(",").map((tag) => tag.trim()) : [],
        assignedStudents: formData.assignedStudents ? formData.assignedStudents.split(",").map((id) => id.trim()) : [],
        pages: [
          {
            id: "1",
            pageNumber: 1,
            content: formData.content,
            highlights: [],
            images: [],
          },
        ],
        createdBy: "admin",
        updatedAt: serverTimestamp(),
      }

      if (editingNote) {
        await updateDoc(doc(db, "notes", editingNote.id), noteData)
        toast({
          title: "Success",
          description: "Note updated successfully",
        })
      } else {
        await addDoc(collection(db, "notes"), {
          ...noteData,
          createdAt: serverTimestamp(),
        })
        toast({
          title: "Success",
          description: "Note created successfully",
        })
      }

      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving note:", error)
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setFormData({
      title: note.title,
      titleEn: note.titleEn || note.title,
      titleSi: note.titleSi || note.title,
      content: note.content,
      subjectId: note.subjectId,
      categoryId: note.categoryId,
      thumbnail: note.thumbnail || "",
      difficulty: note.difficulty,
      estimatedReadTime: note.estimatedReadTime || 5,
      tags: note.tags?.join(", ") || "",
      assignedStudents: note.assignedStudents?.join(", ") || "",
    })
    setIsEditModalOpen(true)
  }

  const handleDelete = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, "notes", noteId))
      toast({
        title: "Success",
        description: "Note deleted successfully",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting note:", error)
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      titleEn: "",
      titleSi: "",
      content: "",
      subjectId: "",
      categoryId: "",
      thumbnail: "",
      difficulty: "medium",
      estimatedReadTime: 5,
      tags: "",
      assignedStudents: "",
    })
    setEditingNote(null)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
  }

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId)
    return subject ? subject.name : "Unknown Subject"
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Unknown Category"
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

  const exportNotes = () => {
    const exportData = notes.map((note) => ({
      ...note,
      subjectName: getSubjectName(note.subjectId),
      categoryName: getCategoryName(note.categoryId),
    }))

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `notes_export_${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    toast({
      title: "Success",
      description: "Notes exported successfully",
    })
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notes Management</h2>
          <p className="text-muted-foreground">Create and manage study notes with multi-page support</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportNotes} className="hover:bg-blue-50 bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setIsJsonUploadOpen(true)} className="hover:bg-green-50">
            <Upload className="h-4 w-4 mr-2" />
            Import JSON
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>Add a new study note with thumbnail and metadata</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter note title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="titleEn">Title (English)</Label>
                    <Input
                      id="titleEn"
                      value={formData.titleEn}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      placeholder="English title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="titleSi">Title (Sinhala)</Label>
                    <Input
                      id="titleSi"
                      value={formData.titleSi}
                      onChange={(e) => setFormData({ ...formData, titleSi: e.target.value })}
                      placeholder="Sinhala title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail URL</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="thumbnail"
                        value={formData.thumbnail}
                        onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                      <Button type="button" variant="outline" size="sm">
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select
                      value={formData.subjectId}
                      onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: "easy" | "medium" | "hard") =>
                        setFormData({ ...formData, difficulty: value })
                      }
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedReadTime">Estimated Read Time (minutes)</Label>
                    <Input
                      id="estimatedReadTime"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.estimatedReadTime}
                      onChange={(e) =>
                        setFormData({ ...formData, estimatedReadTime: Number.parseInt(e.target.value) || 5 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="physics, mechanics, waves"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedStudents">Assigned Students (comma-separated IDs)</Label>
                  <Input
                    id="assignedStudents"
                    value={formData.assignedStudents}
                    onChange={(e) => setFormData({ ...formData, assignedStudents: e.target.value })}
                    placeholder="student1, student2, student3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter note content (supports Markdown and image links)"
                    rows={10}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports Markdown formatting and image links: ![alt text](image-url)
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-500">
                    Create Note
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Subjects" />
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
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{notes.length}</p>
                <p className="text-xs text-muted-foreground">Total Notes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{notes.filter((n) => n.difficulty === "easy").length}</p>
                <p className="text-xs text-muted-foreground">Easy Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{notes.filter((n) => n.difficulty === "medium").length}</p>
                <p className="text-xs text-muted-foreground">Medium Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{notes.filter((n) => n.difficulty === "hard").length}</p>
                <p className="text-xs text-muted-foreground">Hard Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <Card key={note.id} className="hover:shadow-lg transition-shadow duration-200">
            {note.thumbnail && (
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img
                  src={note.thumbnail || "/placeholder.svg"}
                  alt={note.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge className={getDifficultyColor(note.difficulty)}>{note.difficulty}</Badge>
                  {note.pages && note.pages.some((page) => page.images && page.images.length > 0) && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Images
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
              </div>
              <CardDescription>
                <div className="flex items-center space-x-2 text-sm mb-2">
                  <Badge variant="secondary">{getSubjectName(note.subjectId)}</Badge>
                  <Badge variant="outline">{getCategoryName(note.categoryId)}</Badge>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{note.pages?.length || 1} pages</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{note.estimatedReadTime || 5}min</span>
                  </span>
                </div>
                <span className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{note.createdAt.toLocaleDateString()}</span>
                </span>
              </div>

              {note.assignedStudents && note.assignedStudents.length > 0 && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
                  <ImageIcon className="h-4 w-4" />
                  <span>Assigned to {note.assignedStudents.length} students</span>
                </div>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(note)} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600 bg-transparent">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Note</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{note.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(note.id)} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedSubject !== "all" || selectedCategory !== "all"
                ? "Try adjusting your search criteria"
                : "Create your first note to get started"}
            </p>
            {!searchTerm && selectedSubject === "all" && selectedCategory === "all" && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>Update note details and content</DialogDescription>
          </DialogHeader>
          {editingNote && (
            <MultiPageNoteEditor
              note={editingNote}
              subjects={subjects}
              categories={categories}
              onSave={(updatedNote) => {
                fetchData()
                setIsEditModalOpen(false)
                setEditingNote(null)
                toast({
                  title: "Success",
                  description: "Note updated successfully",
                })
              }}
              onCancel={() => {
                setIsEditModalOpen(false)
                setEditingNote(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* JSON Upload Modal */}
      <JsonUploadModal
        isOpen={isJsonUploadOpen}
        onClose={() => setIsJsonUploadOpen(false)}
        onSuccess={() => {
          fetchData()
          setIsJsonUploadOpen(false)
        }}
        subjects={subjects}
        categories={categories}
      />
    </div>
  )
}
