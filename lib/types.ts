export interface User {
  id: string
  email: string
  role: "admin" | "student"
  name: string
  createdAt: Date
  lastLogin?: Date
}

export interface Subject {
  id: string
  name: string
  nameEn: string
  nameSi: string
  description: string
  categoryId: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  nameEn: string
  nameSi: string
  description: string
  thumbnail?: string
  createdAt: Date
}

export interface Note {
  id: string
  title: string
  titleEn: string
  titleSi: string
  content: string
  subjectId: string
  categoryId: string
  pages: NotePage[]
  thumbnail?: string
  difficulty: "easy" | "medium" | "hard"
  estimatedReadTime: number
  tags: string[]
  assignedStudents?: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface NotePage {
  id: string
  pageNumber: number
  content: string
  images?: NoteImage[]
  highlights?: Highlight[]
}

export interface NoteImage {
  id: string
  url: string
  caption?: string
  alt: string
  position: "top" | "middle" | "bottom" | "inline"
}

export interface Highlight {
  id: string
  text: string
  startOffset: number
  endOffset: number
  color: string
  note?: string
  createdAt: Date
}

export interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  noteId: string
  subjectId: string
  difficulty: "easy" | "medium" | "hard"
  points: number
  timeLimit?: number
  assignedStudents?: string[]
  createdBy: string
  createdAt: Date
}

export interface QuestionAttempt {
  id: string
  questionId: string
  studentId: string
  selectedAnswer: number
  isCorrect: boolean
  timeSpent: number
  attemptedAt: Date
}

export interface StudentProgress {
  id: string
  studentId: string
  noteId: string
  questionsAttempted: number
  questionsCorrect: number
  score: number
  completedAt: Date
  highlights: Highlight[]
  readingProgress: number
  timeSpent: number
}

export interface QuizSession {
  id: string
  studentId: string
  noteId?: string
  subjectId?: string
  questions: Question[]
  answers: QuestionAttempt[]
  score: number
  totalQuestions: number
  startedAt: Date
  completedAt?: Date
  timeSpent: number
}
