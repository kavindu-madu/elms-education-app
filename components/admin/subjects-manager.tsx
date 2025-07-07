"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Subject, Category } from "@/lib/types"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, FolderOpen, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function SubjectsManager() {
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [subjectFormData, setSubjectFormData] = useState({
    name: "",
    nameEn: "",
    nameSi: "",
    description: "",
    categoryId: "",
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    nameEn: "",
    nameSi: "",
    description: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [subjectsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "categories")),
      ])

      const subjectsData = subjectsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          }) as Subject,
      )

      const categoriesData = categoriesSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }) as Category,
      )

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

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const subjectData = {
        ...subjectFormData,
        ...(editingSubject ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
      }

      if (editingSubject) {
        await updateDoc(doc(db, "subjects", editingSubject.id), subjectData)
        toast({
          title: "Success",
          description: "Subject updated successfully",
        })
      } else {
        await addDoc(collection(db, "subjects"), subjectData)
        toast({
          title: "Success",
          description: "Subject created successfully",
        })
      }

      setSubjectDialogOpen(false)
      setEditingSubject(null)
      setSubjectFormData({
        name: "",
        nameEn: "",
        nameSi: "",
        description: "",
        categoryId: "",
      })
      fetchData()
    } catch (error) {
      console.error("Error saving subject:", error)
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive",
      })
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const categoryData = {
        ...categoryFormData,
        createdAt: serverTimestamp(),
      }

      if (editingCategory) {
        await updateDoc(doc(db, "categories", editingCategory.id), categoryData)
        toast({
          title: "Success",
          description: "Category updated successfully",
        })
      } else {
        await addDoc(collection(db, "categories"), categoryData)
        toast({
          title: "Success",
          description: "Category created successfully",
        })
      }

      setCategoryDialogOpen(false)
      setEditingCategory(null)
      setCategoryFormData({
        name: "",
        nameEn: "",
        nameSi: "",
        description: "",
      })
      fetchData()
    } catch (error) {
      console.error("Error saving category:", error)
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      })
    }
  }

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject)
    setSubjectFormData({
      name: subject.name,
      nameEn: subject.nameEn,
      nameSi: subject.nameSi,
      description: subject.description,
      categoryId: subject.categoryId,
    })
    setSubjectDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      nameEn: category.nameEn,
      nameSi: category.nameSi,
      description: category.description,
    })
    setCategoryDialogOpen(true)
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return

    try {
      await deleteDoc(doc(db, "subjects", subjectId))
      toast({
        title: "Success",
        description: "Subject deleted successfully",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting subject:", error)
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      await deleteDoc(doc(db, "categories", categoryId))
      toast({
        title: "Success",
        description: "Category deleted successfully",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Unknown Category"
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subjects & Categories</h2>
        <p className="text-muted-foreground">Manage subjects and categories</p>
      </div>

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Subjects</h3>
            <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSubject ? "Edit Subject" : "Create New Subject"}</DialogTitle>
                  <DialogDescription>
                    {editingSubject
                      ? "Update the subject details below."
                      : "Fill in the details to create a new subject."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubjectSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject-name">Name</Label>
                    <Input
                      id="subject-name"
                      value={subjectFormData.name}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject-nameEn">Name (English)</Label>
                      <Input
                        id="subject-nameEn"
                        value={subjectFormData.nameEn}
                        onChange={(e) => setSubjectFormData({ ...subjectFormData, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject-nameSi" className="sinhala-text">
                        Name (සිංහල)
                      </Label>
                      <Input
                        id="subject-nameSi"
                        value={subjectFormData.nameSi}
                        onChange={(e) => setSubjectFormData({ ...subjectFormData, nameSi: e.target.value })}
                        className="sinhala-text"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject-category">Category</Label>
                    <Select
                      value={subjectFormData.categoryId}
                      onValueChange={(value) => setSubjectFormData({ ...subjectFormData, categoryId: value })}
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
                    <Label htmlFor="subject-description">Description</Label>
                    <Textarea
                      id="subject-description"
                      value={subjectFormData.description}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setSubjectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingSubject ? "Update" : "Create"} Subject</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Card key={subject.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="line-clamp-1">{subject.name}</span>
                  </CardTitle>
                  <CardDescription>{getCategoryName(subject.categoryId)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subject.nameEn && <p className="text-sm text-muted-foreground">EN: {subject.nameEn}</p>}
                    {subject.nameSi && (
                      <p className="text-sm text-muted-foreground sinhala-text">SI: {subject.nameSi}</p>
                    )}
                    {subject.description && <p className="text-sm line-clamp-2">{subject.description}</p>}
                  </div>
                  <div className="flex justify-end space-x-1 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEditSubject(subject)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteSubject(subject.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {subjects.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No subjects found</h3>
              <p className="text-muted-foreground mb-4">Create your first subject to get started.</p>
              <Button onClick={() => setSubjectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Categories</h3>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? "Update the category details below."
                      : "Fill in the details to create a new category."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Name</Label>
                    <Input
                      id="category-name"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-nameEn">Name (English)</Label>
                      <Input
                        id="category-nameEn"
                        value={categoryFormData.nameEn}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-nameSi" className="sinhala-text">
                        Name (සිංහල)
                      </Label>
                      <Input
                        id="category-nameSi"
                        value={categoryFormData.nameSi}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, nameSi: e.target.value })}
                        className="sinhala-text"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description">Description</Label>
                    <Textarea
                      id="category-description"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingCategory ? "Update" : "Create"} Category</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FolderOpen className="h-5 w-5" />
                    <span className="line-clamp-1">{category.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.nameEn && <p className="text-sm text-muted-foreground">EN: {category.nameEn}</p>}
                    {category.nameSi && (
                      <p className="text-sm text-muted-foreground sinhala-text">SI: {category.nameSi}</p>
                    )}
                    {category.description && <p className="text-sm line-clamp-2">{category.description}</p>}
                  </div>
                  <div className="flex justify-end space-x-1 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-4">Create your first category to get started.</p>
              <Button onClick={() => setCategoryDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
