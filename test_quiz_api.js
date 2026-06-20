const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function runTest() {
  try {
    const response = await fetch('http://localhost:5000/api/learning/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: "Photosynthesis",
        language: "hi",
        classLevel: 8,
        subject: "Science",
        chapter: "Chapter 1",
        numQuestions: 5,
        difficulty: "easy"
      })
    });
    const data = await response.json();
    console.log("Success:", data.success);
    console.log("Number of questions generated:", data.questions?.length);
    console.log("Sample question:", JSON.stringify(data.questions?.[0], null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();
