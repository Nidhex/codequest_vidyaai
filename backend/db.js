const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database with default template if not exists
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: [
      {
        id: "student_1",
        role: "student",
        name: "Aarav Sharma",
        streak: 5,
        xp: 1250,
        level: 4,
        badges: ["Language Pioneer", "Feynman Scholar", "Debate Champion"],
        completedLessons: ["photosynthesis-1", "solar-system-1"],
        streakLogs: [1, 1, 1, 1, 1], // Last 5 days
        subjectProgress: {
          Science: 75,
          History: 40,
          Geography: 60,
          Mathematics: 25
        }
      },
      {
        id: "teacher_1",
        role: "teacher",
        name: "Dr. Priyamvada Sen",
        classLevels: [3, 8, 12],
        lessonsPlanned: [
          { id: "lp-1", title: "Photosynthesis for Class 8", language: "Hindi", classLevel: 8 },
          { id: "lp-2", title: "Evolution of Stars for Class 12", language: "Bengali", classLevel: 12 }
        ]
      }
    ],
    lessons: [],
    debates: [
      {
        id: "deb-1",
        userId: "student_1",
        topic: "Artificial Intelligence in Agriculture",
        role: "Proposer",
        scores: { logic: 85, grammar: 90, confidence: 80, reasoning: 88, communication: 87 },
        timestamp: "2026-06-19T14:30:00Z"
      }
    ],
    quizzes: [
      {
        id: "q-1",
        userId: "student_1",
        topic: "Photosynthesis",
        score: 80,
        totalQuestions: 5,
        timestamp: "2026-06-19T15:00:00Z"
      }
    ],
    analytics: {
      dailyActiveStudents: [15, 22, 18, 29, 32, 28, 35],
      languageDistribution: {
        Hindi: 45,
        Gujarati: 12,
        Bengali: 15,
        Tamil: 10,
        Telugu: 8,
        English: 10
      },
      attentionScores: [82, 85, 78, 88, 84, 86, 91]
    }
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
}

function getData() {
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading fallback database:", err);
    return { users: [], lessons: [], debates: [], quizzes: [], analytics: {} };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing fallback database:", err);
  }
}

module.exports = {
  getData,
  saveData,
  getUser(id) {
    const db = getData();
    return db.users.find(u => u.id === id);
  },
  updateUser(id, updates) {
    const db = getData();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...updates };
      saveData(db);
      return db.users[idx];
    }
    return null;
  },
  addDebate(debate) {
    const db = getData();
    db.debates.push(debate);
    saveData(db);
    return debate;
  },
  addQuizResult(result) {
    const db = getData();
    db.quizzes.push(result);
    saveData(db);
    return result;
  },
  getAnalytics() {
    const db = getData();
    return db.analytics;
  }
};
