"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, ChevronLeft, ChevronRight, FileText, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { NotePage } from "@/lib/types"

interface MultiPageNoteEditorProps {
  pages: NotePage[]
  onPagesChange: (pages: NotePage[]) => void
}

export function MultiPageNoteEditor({ pages, onPagesChange }: MultiPageNoteEditorProps) {
  const { toast } = useToast()
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState(false)

  const addPage = () => {
    const newPage: NotePage = {
      id: Date.now().toString(),
      pageNumber: pages.length + 1,
      content: "",
      highlights: [],
    }
    const updatedPages = [...pages, newPage]
    onPagesChange(updatedPages)
    setCurrentPageIndex(updatedPages.length - 1)
    toast({
      title: "Page added",
      description: `Page ${newPage.pageNumber} has been added`,
    })
  }

  const deletePage = (pageIndex: number) => {
    if (pages.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "A note must have at least one page",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this page?")) return

    const updatedPages = pages.filter((_, index) => index !== pageIndex)
    // Renumber pages
    const renumberedPages = updatedPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }))

    onPagesChange(renumberedPages)

    // Adjust current page index
    if (currentPageIndex >= renumberedPages.length) {
      setCurrentPageIndex(Math.max(0, renumberedPages.length - 1))
    }

    toast({
      title: "Page deleted",
      description: "Page has been removed and pages have been renumbered",
    })
  }

  const updatePageContent = (pageIndex: number, content: string) => {
    const updatedPages = pages.map((page, index) => (index === pageIndex ? { ...page, content } : page))
    onPagesChange(updatedPages)
  }

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return

    const updatedPages = [...pages]
    const [movedPage] = updatedPages.splice(fromIndex, 1)
    updatedPages.splice(toIndex, 0, movedPage)

    // Renumber pages
    const renumberedPages = updatedPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }))

    onPagesChange(renumberedPages)
    setCurrentPageIndex(toIndex)
  }

  const currentPage = pages[currentPageIndex]

  if (!currentPage) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Pages</Label>
          <Button onClick={addPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add First Page
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4" />
          <p>No pages created yet. Add your first page to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Label className="text-lg font-semibold">Pages</Label>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className={previewMode ? "bg-blue-100 text-blue-700" : ""}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Edit" : "Preview"}
          </Button>
          <Button onClick={addPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        </div>
      </div>

      {/* Page Tabs */}
      <Tabs value={currentPageIndex.toString()} onValueChange={(value) => setCurrentPageIndex(Number.parseInt(value))}>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <TabsList className="flex-shrink-0">
            {pages.map((page, index) => (
              <TabsTrigger
                key={page.id}
                value={index.toString()}
                className="relative group data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <span className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Page {page.pageNumber}</span>
                </span>
                {pages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-red-500 text-white hover:bg-red-600 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePage(index)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Page Navigation Arrows */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
              disabled={currentPageIndex === pages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Page Content */}
        {pages.map((page, index) => (
          <TabsContent key={page.id} value={index.toString()} className="space-y-4">
            <Card className="min-h-[500px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Page {page.pageNumber}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {/* Move page buttons */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePage(index, index - 1)}
                      disabled={index === 0}
                      title="Move page up"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePage(index, index + 1)}
                      disabled={index === pages.length - 1}
                      title="Move page down"
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {previewMode ? (
                  <div className="prose prose-lg max-w-none dark:prose-invert min-h-[400px] p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: page.content
                          .replace(/\n/g, "<br>")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`page-content-${index}`}>Page Content (Markdown supported)</Label>
                      <Textarea
                        id={`page-content-${index}`}
                        value={page.content}
                        onChange={(e) => updatePageContent(index, e.target.value)}
                        rows={20}
                        className="font-mono text-sm"
                        placeholder={`# Page ${page.pageNumber} Title

Write your content for page ${page.pageNumber} here...

## Section 1
Content for this section...

## Section 2
More content here...

**Bold text** and *italic text* are supported.

- Bullet points
- Are also supported
- Along with numbered lists

1. First item
2. Second item
3. Third item`}
                      />
                    </div>

                    <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <strong>💡 Tips for creating great pages:</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Use headings (# ## ###) to structure your content</li>
                        <li>Keep each page focused on a specific topic or concept</li>
                        <li>Use **bold** and *italic* text for emphasis</li>
                        <li>Add bullet points and numbered lists for clarity</li>
                        <li>Aim for 300-800 words per page for optimal reading</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Page Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{pages.length}</div>
              <div className="text-sm text-muted-foreground">Total Pages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {pages.reduce((acc, page) => acc + page.content.split(" ").length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Words</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.ceil(pages.reduce((acc, page) => acc + page.content.split(" ").length, 0) / 200)}
              </div>
              <div className="text-sm text-muted-foreground">Est. Reading Time (min)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {pages.filter((page) => page.content.trim().length > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Pages with Content</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
