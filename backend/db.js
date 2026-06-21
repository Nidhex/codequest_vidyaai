const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'database.json');

function getSeedLogs() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return [
    {
      id: "log-seed-1",
      userId: "student_1",
      activityType: "quiz",
      subject: "Science",
      chapter: "Crop Production and Management",
      topic: "Agricultural Implements",
      timestamp: new Date(now - 19 * dayMs).toISOString(),
      timeSpent: 12,
      score: 80,
      totalQuestions: 5,
      correctAnswers: 4,
      wrongAnswers: 1
    },
    {
      id: "log-seed-2",
      userId: "student_1",
      activityType: "lesson",
      subject: "Mathematics",
      chapter: "Fractions",
      topic: "Fractions and Parts of Whole",
      timestamp: new Date(now - 15 * dayMs).toISOString(),
      timeSpent: 20
    },
    {
      id: "log-seed-3",
      userId: "student_1",
      activityType: "feynman",
      subject: "Science",
      chapter: "Structure of the Atom",
      topic: "Bohr Model of Atom",
      timestamp: new Date(now - 12 * dayMs).toISOString(),
      timeSpent: 18,
      score: 85
    },
    {
      id: "log-seed-4",
      userId: "student_1",
      activityType: "debate",
      subject: "English",
      chapter: "Debates",
      topic: "Artificial Intelligence in Agriculture",
      timestamp: new Date(now - 8 * dayMs).toISOString(),
      timeSpent: 15,
      score: 82
    },
    {
      id: "log-seed-5",
      userId: "student_1",
      activityType: "quiz",
      subject: "Science",
      chapter: "Crop Production and Management",
      topic: "Photosynthesis",
      timestamp: new Date(now - 5 * dayMs).toISOString(),
      timeSpent: 10,
      score: 60, // Under 70%, weak topic
      totalQuestions: 5,
      correctAnswers: 3,
      wrongAnswers: 2
    },
    {
      id: "log-seed-6",
      userId: "student_1",
      activityType: "lesson",
      subject: "Hindi",
      chapter: "Hindi Literature",
      topic: "Hindi scripts vocabulary",
      timestamp: new Date(now - 4 * dayMs).toISOString(),
      timeSpent: 25
    },
    {
      id: "log-seed-7",
      userId: "student_1",
      activityType: "quiz",
      subject: "Mathematics",
      chapter: "Fractions",
      topic: "Equivalent Fractions",
      timestamp: new Date(now - 3 * dayMs).toISOString(),
      timeSpent: 15,
      score: 90,
      totalQuestions: 10,
      correctAnswers: 9,
      wrongAnswers: 1
    },
    {
      id: "log-seed-8",
      userId: "student_1",
      activityType: "feynman",
      subject: "Social Science",
      chapter: "History",
      topic: "Industrial Revolution",
      timestamp: new Date(now - 2 * dayMs).toISOString(),
      timeSpent: 14,
      score: 55 // Under 70%, weak topic
    },
    {
      id: "log-seed-9",
      userId: "student_1",
      activityType: "quiz",
      subject: "Science",
      chapter: "Crop Production and Management",
      topic: "Agricultural Implements",
      timestamp: new Date(now - 1 * dayMs).toISOString(),
      timeSpent: 15,
      score: 100,
      totalQuestions: 10,
      correctAnswers: 10,
      wrongAnswers: 0
    }
  ];
}

// Recalculates stats, subject Progress, streaks, and levels dynamically
function recalculateUserStats(userId, data) {
  const user = data.users.find(u => u.id === userId);
  if (!user) return;

  const logs = data.studyLogs.filter(l => l.userId === userId);
  
  // 1. Recalculate subject Progress (mastery %)
  const subjects = ["Science", "Mathematics", "Social Science", "English", "Hindi"];
  const progress = {};
  
  subjects.forEach(sub => {
    const subLogs = logs.filter(l => l.subject && l.subject.toLowerCase() === sub.toLowerCase());
    
    // Graded logs
    const gradedLogs = subLogs.filter(l => l.score !== undefined && l.score !== null);
    // Lesson logs
    const lessonLogs = subLogs.filter(l => l.activityType === 'lesson');
    
    let avgScore = 70; // baseline
    if (gradedLogs.length > 0) {
      const sum = gradedLogs.reduce((acc, l) => acc + l.score, 0);
      avgScore = sum / gradedLogs.length;
    }
    
    const lessonCount = lessonLogs.length;
    const lessonProgress = Math.min(lessonCount * 20, 100); // 20% per lesson up to 100%
    
    // Weighted formula: 70% average performance, 30% completeness
    const mastery = Math.round((avgScore * 0.7) + (lessonProgress * 0.3));
    progress[sub] = Math.min(Math.max(mastery, 10), 100);
  });
  
  user.subjectProgress = progress;

  // 2. Recalculate streak & streakLogs (last 5 days)
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const activeDates = new Set(logs.map(l => {
    const d = new Date(l.timestamp);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }));
  
  const streakLogs = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    streakLogs.push(activeDates.has(dateStr) ? 1 : 0);
  }
  user.streakLogs = streakLogs;

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(now);
  
  // If they didn't study today, count starting from yesterday
  const todayStr = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
  if (!activeDates.has(todayStr)) {
    checkDate = new Date(now.getTime() - dayMs);
  }
  
  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
    if (activeDates.has(dateStr)) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - dayMs);
    } else {
      break;
    }
  }
  
  user.streak = Math.max(currentStreak, 1);
}

const initialTemplate = {
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
      streakLogs: [1, 1, 1, 1, 1],
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
  studyLogs: [],
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

// Initialize database with default template if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialTemplate, null, 2), 'utf8');
}

function getData() {
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(content);
    let dirty = false;
    if (!data.studyLogs) {
      data.studyLogs = [];
      dirty = true;
    }
    if (data.studyLogs.length === 0) {
      data.studyLogs = getSeedLogs();
      dirty = true;
    }
    
    // Seed default credentials for Aarav Sharma & Dr Priyamvada Sen if missing
    let userDirty = false;
    if (Array.isArray(data.users)) {
      data.users.forEach(u => {
        if (!u.email) {
          if (u.id === 'student_1') {
            u.email = 'aarav@gmail.com';
            u.passwordHash = bcrypt.hashSync('password123', 10);
            userDirty = true;
          } else if (u.id === 'teacher_1') {
            u.email = 'teacher@gmail.com';
            u.passwordHash = bcrypt.hashSync('password123', 10);
            userDirty = true;
          }
        }
      });
    }

    // Perform sync updates for student_1 profile based on seed logs
    if (dirty) {
      recalculateUserStats("student_1", data);
    }
    if (dirty || userDirty) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
    return data;
  } catch (err) {
    console.error("Error reading fallback database:", err);
    return { ...initialTemplate, studyLogs: getSeedLogs() };
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
  getUserByEmail(email) {
    const db = getData();
    return db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  },
  createUser(userPayload) {
    const db = getData();
    const id = "user-" + Math.random().toString(36).substr(2, 9);
    
    let newUser;
    if (userPayload.role === 'teacher') {
      newUser = {
        id,
        role: 'teacher',
        name: userPayload.name,
        email: userPayload.email,
        passwordHash: userPayload.passwordHash,
        classLevels: [userPayload.classLevel || 8],
        lessonsPlanned: []
      };
    } else {
      newUser = {
        id,
        role: 'student',
        name: userPayload.name,
        email: userPayload.email,
        passwordHash: userPayload.passwordHash,
        class: String(userPayload.classLevel || 8),
        preferredLanguage: userPayload.preferredLanguage || 'English',
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
        completedLessons: [],
        streakLogs: [0, 0, 0, 0, 0],
        subjectProgress: {
          Science: 10,
          Mathematics: 10,
          "Social Science": 10,
          English: 10,
          Hindi: 10
        }
      };
    }
    
    db.users.push(newUser);
    saveData(db);
    return newUser;
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
  },
  
  // NEW METHODS FOR ENGAGEMENT AI
  getStudyLogs(userId) {
    const db = getData();
    return db.studyLogs.filter(l => l.userId === userId);
  },
  addStudyLog(log) {
    const db = getData();
    const id = "log-" + Math.random().toString(36).substr(2, 9);
    const newLog = {
      id,
      timestamp: new Date().toISOString(),
      ...log
    };
    db.studyLogs.push(newLog);
    
    // Update user stats
    const user = db.users.find(u => u.id === log.userId);
    if (user) {
      // 1. Calculate XP add
      let xpAdded = 50; // default for lessons
      if (log.activityType === 'quiz') {
        xpAdded = log.score !== undefined ? Math.round(log.score * 1.2) : 80;
      } else if (log.activityType === 'feynman') {
        xpAdded = log.score !== undefined ? Math.round(log.score * 1.5) : 100;
      } else if (log.activityType === 'debate') {
        xpAdded = log.score !== undefined ? Math.round(log.score * 1.5) : 120;
      }
      
      user.xp += xpAdded;
      user.level = Math.floor(user.xp / 400) + 1;
      
      // Update badge triggers
      if (user.xp >= 1500 && !user.badges.includes("Legendary Learner")) {
        user.badges.push("Legendary Learner");
      }
      if (db.studyLogs.filter(l => l.userId === user.id && l.activityType === 'debate').length >= 3 && !user.badges.includes("Debate Master")) {
        user.badges.push("Debate Master");
      }
      if (db.studyLogs.filter(l => l.userId === user.id && l.activityType === 'feynman').length >= 3 && !user.badges.includes("Feynman Sage")) {
        user.badges.push("Feynman Sage");
      }
      
      // Add to completed lessons
      if (log.activityType === 'lesson' && log.topic) {
        if (!user.completedLessons.includes(log.topic)) {
          user.completedLessons.push(log.topic);
        }
      }
      
      // 2. Recalculate HSL progressions, streaks, and subject progress
      recalculateUserStats(user.id, db);
    }
    
    saveData(db);
    return { log: newLog, user: user || null };
  }
};
