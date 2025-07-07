import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyB3xibgHexn2VjcWwvYjt7FJXvGq3fUP78",
  authDomain: "notes-al.firebaseapp.com",
  projectId: "notes-al",
  storageBucket: "notes-al.firebasestorage.app",
  messagingSenderId: "983793402003",
  appId: "1:983793402003:web:8ac0e5646fc064980f4d66",
  measurementId: "G-TG6P75699M",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function seedData() {
  try {
    console.log("Starting data seeding...")

    // Create categories
    const categories = [
      {
        name: "Science",
        nameEn: "Science",
        nameSi: "විද්‍යාව",
        description: "Science subjects for A/L students",
      },
      {
        name: "Mathematics",
        nameEn: "Mathematics",
        nameSi: "ගණිතය",
        description: "Mathematics subjects",
      },
      {
        name: "Commerce",
        nameEn: "Commerce",
        nameSi: "වාණිජ්‍යය",
        description: "Commerce subjects",
      },
    ]

    console.log("Creating categories...")
    const categoryIds = []
    for (const category of categories) {
      const docRef = await addDoc(collection(db, "categories"), {
        ...category,
        createdAt: serverTimestamp(),
      })
      categoryIds.push(docRef.id)
      console.log(`✓ Created category: ${category.name}`)
    }

    // Create subjects
    const subjects = [
      {
        name: "Physics",
        nameEn: "Physics",
        nameSi: "භෞතික විද්‍යාව",
        description: "Advanced Level Physics",
        categoryId: categoryIds[0],
      },
      {
        name: "Chemistry",
        nameEn: "Chemistry",
        nameSi: "රසායන විද්‍යාව",
        description: "Advanced Level Chemistry",
        categoryId: categoryIds[0],
      },
      {
        name: "Biology",
        nameEn: "Biology",
        nameSi: "ජීව විද්‍යාව",
        description: "Advanced Level Biology",
        categoryId: categoryIds[0],
      },
      {
        name: "Combined Mathematics",
        nameEn: "Combined Mathematics",
        nameSi: "සංයුක්ත ගණිතය",
        description: "Advanced Level Combined Mathematics",
        categoryId: categoryIds[1],
      },
    ]

    console.log("Creating subjects...")
    const subjectIds = []
    for (const subject of subjects) {
      const docRef = await addDoc(collection(db, "subjects"), {
        ...subject,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      subjectIds.push(docRef.id)
      console.log(`✓ Created subject: ${subject.name}`)
    }

    // Create demo users data (Firebase Auth users need to be created through the UI)
    console.log("Creating user records...")

    // Note: In a real environment, you'd create the auth users first, then add their data
    // For demo purposes, we'll create placeholder user documents
    const adminUser = {
      name: "Admin User",
      email: "admin@elms.lk",
      role: "admin",
      createdAt: serverTimestamp(),
    }

    const studentUser = {
      name: "Student User",
      email: "student@elms.lk",
      role: "student",
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, "users"), adminUser)
    await addDoc(collection(db, "users"), studentUser)
    console.log("✓ Created user records")

    // Create sample notes
    console.log("Creating sample notes...")
    const sampleNotes = [
      {
        title: "Introduction to Mechanics",
        titleEn: "Introduction to Mechanics",
        titleSi: "යාන්ත්‍රික විද්‍යාවට හැඳින්වීම",
        content: `# Introduction to Mechanics

Mechanics is a branch of physics that deals with the motion of objects and the forces that cause this motion.

## Key Concepts

### 1. Kinematics
Kinematics describes motion without considering the forces that cause it.

**Key equations:**
- v = u + at
- s = ut + ½at²
- v² = u² + 2as

### 2. Dynamics
Dynamics deals with the forces that cause motion.

**Newton's Laws:**
1. First Law (Law of Inertia)
2. Second Law (F = ma)
3. Third Law (Action-Reaction)

### 3. Energy and Work
- Work = Force × Distance
- Kinetic Energy = ½mv²
- Potential Energy = mgh`,
        subjectId: subjectIds[0], // Physics
        categoryId: categoryIds[0], // Science
        pages: [
          {
            id: "1",
            pageNumber: 1,
            content: `# Introduction to Mechanics

Mechanics is a branch of physics that deals with the motion of objects and the forces that cause this motion.

## What is Mechanics?

Mechanics can be divided into two main branches:
- **Kinematics**: The study of motion without considering forces
- **Dynamics**: The study of forces and their effects on motion

Understanding mechanics is fundamental to physics and engineering applications.`,
            highlights: [],
          },
          {
            id: "2",
            pageNumber: 2,
            content: `## Key Concepts in Kinematics

### Motion in One Dimension

When an object moves in a straight line, we can describe its motion using these key equations:

**Velocity-Time Relationship:**
v = u + at

Where:
- v = final velocity
- u = initial velocity  
- a = acceleration
- t = time

**Displacement-Time Relationship:**
s = ut + ½at²

**Velocity-Displacement Relationship:**
v² = u² + 2as

These equations form the foundation of kinematic analysis.`,
            highlights: [],
          },
        ],
        createdBy: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        title: "Organic Chemistry Basics",
        titleEn: "Organic Chemistry Basics",
        titleSi: "කාබනික රසායන විද්‍යාවේ මූලික කරුණු",
        content: `# Organic Chemistry Basics

Organic chemistry is the study of carbon-containing compounds.

## Hydrocarbons

### Alkanes
- Saturated hydrocarbons
- General formula: CnH2n+2
- Examples: Methane (CH4), Ethane (C2H6)

### Alkenes  
- Unsaturated hydrocarbons with double bonds
- General formula: CnH2n
- Examples: Ethene (C2H4), Propene (C3H6)

### Alkynes
- Unsaturated hydrocarbons with triple bonds
- General formula: CnH2n-2
- Examples: Ethyne (C2H2), Propyne (C3H4)

## Functional Groups

Important functional groups include:
- Alcohols (-OH)
- Aldehydes (-CHO)
- Ketones (C=O)
- Carboxylic acids (-COOH)`,
        subjectId: subjectIds[1], // Chemistry
        categoryId: categoryIds[0], // Science
        pages: [
          {
            id: "1",
            pageNumber: 1,
            content: `# Organic Chemistry Basics

Organic chemistry is the study of carbon-containing compounds and their properties, reactions, and synthesis.

## Why Study Organic Chemistry?

Carbon is unique because it can:
- Form four covalent bonds
- Create long chains and rings
- Bond with many different elements
- Form single, double, and triple bonds

This versatility makes carbon the backbone of all living organisms.`,
            highlights: [],
          },
        ],
        createdBy: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ]

    for (const note of sampleNotes) {
      await addDoc(collection(db, "notes"), note)
      console.log(`✓ Created note: ${note.title}`)
    }

    console.log("🎉 Data seeding completed successfully!")
    console.log("📝 Demo accounts:")
    console.log("   Admin: admin@elms.lk / admin123")
    console.log("   Student: student@elms.lk / student123")
    console.log("⚠️  Note: You'll need to create these auth accounts manually through the login form first.")
  } catch (error) {
    console.error("❌ Error seeding data:", error)
    throw error
  }
}

// Execute the seed function
console.log("🚀 Starting ELMS database seeding...")
await seedData()
