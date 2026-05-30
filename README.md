# 🧠 INTERVIEW.AI // Neural Assessment Protocol

> **An autonomous, multi-modal AI interviewer built to conduct, transcribe, and evaluate technical interviews in real-time.**

INTERVIEW.AI is a high-tech, full-stack web application designed to simulate a Senior Technical Interview. By leveraging local Large Language Models (LLMs) and advanced speech recognition, it parses candidate resumes, generates tailored questions, listens to verbal responses, and provides a strict, real-time grading and feedback loop.

---

## ⚡ Core Features

* **📄 Neural Resume Parsing:** Upload a PDF resume. The system extracts skills, experience, and projects using `pdfplumber` and Llama 3 to build a custom candidate profile.
* **🎯 Dynamic Question Generation:** Automatically creates exactly 10 targeted interview questions (Behavioral, Technical, and Scenario-based) derived specifically from the candidate's uploaded resume.
* **🎙️ Voice-Activated Arena:** A gamified, J.A.R.V.I.S.-inspired Next.js interface that guides candidates through the interview. Features a live silence-detection watchdog that auto-submits answers when the candidate finishes speaking.
* **⚖️ The AI Judge:** Evaluates transcribed answers against the original question. It grades out of 10, penalizes filler words (um, ah, like), and provides instant technical and communication feedback.
* **📊 Analytics Dashboard:** A post-interview debriefing terminal that displays the overall score, filler word counts, and a complete breakdown of every answer and AI critique.

---

## 🛠️ Tech Stack & Architecture

### **Frontend (Client-Side)**
* **Framework:** Next.js / React
* **Styling:** Tailwind CSS (Custom "Tactical Neural" dark mode UI)
* **Audio Handling:** Native Web Speech API (`SpeechRecognition`)
* **State Management:** Advanced React Hooks (`useRef`, `useCallback`) for bulletproof audio stream and timer management.

### **Backend (Server-Side)**
* **Framework:** FastAPI (Python)
* **Database:** Supabase (PostgreSQL) for candidate profiling and question storage.
* **File Processing:** `pdfplumber`
* **Concurrency:** Fully asynchronous endpoints ensuring non-blocking ML operations.

### **Machine Learning & AI**
* **LLM Engine:** Ollama running **Llama 3** locally for privacy, resume parsing, and strict grading.
* **Audio Transcription:** Dual-fallback system using Browser Web Speech API or **OpenAI Whisper** (Base model).

---

## 🚀 Local Deployment Instructions

### Prerequisites
1. **Node.js & npm** installed.
2. **Python 3.10+** installed.
3. **Ollama** installed locally and running `llama3` (`ollama pull llama3`).
4. **Supabase** account with a `candidates` table set up.

### 1. Database Setup (Supabase)
Create a table named `candidates` with the following columns:
* `id` (uuid, primary key)
* `name` (text)
* `skills` (jsonb)
* `projects` (jsonb)
* `experience` (jsonb)
* `raw_resume_text` (text)
* `generated_questions` (jsonb)

### 2. Backend Setup
Navigate to the backend directory, set up your virtual environment, and install dependencies.
```bash
cd backend
python -m venv .venv

# Activate the virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install fastapi uvicorn python-multipart pdfplumber ollama supabase python-dotenv openai-whisper