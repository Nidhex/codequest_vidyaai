# VIDYA AI — India’s Next-Generation Multilingual AI Learning Platform

> **Tagline**: *"Quality Education in Every Indian Language."*
> **Core Focus**: Solving the **Multilingual Content Generation Crisis in India** by delivering curriculum-aligned, interactive, and voice-enabled learning in regional languages.

---

## 🌟 The Mission

Millions of students across India are held back from quality education because the vast majority of advanced educational AI systems only support English.

**VIDYA AI** bridges this divide by delivering:
1. **AI-generated educational content** localized for 22 Indian languages.
2. **Dynamic 3D Holographic AI Teachers** that react emotionally and lip-sync speech.
3. **Privacy-first Eye Tracking & Attention Meters** that compute study fatigue client-side.
4. **Interactive Feynman & Debate Arenas** that encourage active Socratic learning.
5. **NCERT RAG (Retrieval-Augmented Generation)** search engines with textbook citations.

---

## 🛠 Technology Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Three.js
* **Backend**: Node.js, Express, Socket.IO, Helmet, Express-Rate-Limit
* **RAG Service**: Python FastAPI, ChromaDB, Sentence-Transformers (`paraphrase-multilingual-MiniLM-L12-v2`)
* **Database**: In-memory persistent JSON store (`database.json` fallback adapter)

---

## 🚀 Quick Start Guide

### Automated Startup (Windows)
Double-click the `run.bat` file in the root workspace. This script will automatically check and install node modules, install pip libraries, and start the frontend, backend, and RAG services concurrently.

### Manual Startup

1. **Install Backend & Frontend Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Install RAG python packages**:
   ```bash
   pip install -r rag-service/requirements.txt
   ```

3. **Start All Services Concurrently**:
   ```bash
   npm run dev
   ```
   * **Vite Client**: `http://localhost:5173`
   * **Express Orchestrator**: `http://localhost:5000`
   * **FastAPI RAG Service**: `http://localhost:8000`

---

## 🧠 Core Features & User Flows

1. **3D Avatar Teacher**: Embedded in the classrooms, the WebGL holographic head pulses and deforms its mesh dynamically to lip-sync audio speech synthesis.
2. **22 Language Selector**: Translate interfaces instantly (Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Urdu, Sanskrit) with RTL script rendering for Urdu.
3. **Curriculum Complexity Selector**: Adapt lessons dynamically for Class 3 (primary metaphors), Class 8 (scientific breakdowns), and Class 12 (molecular/mathematical equations).
4. **Feynman Socratic Mode**: Explain concepts back to the AI using text or speech dictation. The AI scores comprehension, logs missing keywords, and asks follow-up questions.
5. **Multiplayer Debate Arena**: Argue points on socio-cultural issues. Real-time scores evaluate logic, reasoning, and speech delivery. Arguments are synchronized between classmate devices using Socket.IO.
6. **Attention AI Monitor**: In-browser FaceMesh eye-tracking calculates blinking (EAR) and head gaze direction, logging focus timelines without sending facial data to any server.
