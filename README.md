# 🧠 INTERVIEW.AI • Neural Assessment Protocol

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14+](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)

**An autonomous, multi-modal AI interviewer that conducts, transcribes, and evaluates technical interviews in real-time with privacy-first local LLMs.**

[Features](#-core-features) • [Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Deployment](#-local-deployment) • [Workflow](#-interview-workflow)

</div>

---

## 📋 Overview

INTERVIEW.AI is a cutting-edge full-stack platform designed to simulate **Senior Technical Interviews** with enterprise-grade precision. It leverages **Ollama + Llama 3** (local, privacy-preserving LLMs) alongside Web Speech APIs to parse resumes, generate contextual questions, capture verbal responses in real-time, and deliver AI-powered evaluations—all without leaving your infrastructure.

**Why INTERVIEW.AI?**
- 🔒 **100% Private** – All processing happens locally (Ollama)
- ⚡ **Real-time Evaluation** – Instant scoring & feedback loop
- 🎯 **Resume-Driven** – Questions generated from candidate's actual experience
- 🎙️ **Voice-First UI** – Gamified interview arena with silence detection

---

## ⚡ Core Features

| Feature | Description |
|---------|-------------|
| **📄 Neural Resume Parsing** | PDF resume analysis using `pdfplumber` + Llama 3 to extract skills, experience, and projects into a candidate profile |
| **🎯 Dynamic Question Generation** | Auto-generates 10 contextual interview questions (Technical, Behavioral, Scenario) tailored to candidate background |
| **🎙️ Voice-Activated Arena** | J.A.R.V.I.S.-inspired Next.js interface with live speech recognition & 2.5-second silence auto-submit |
| **⚖️ AI-Powered Grading** | Real-time answer evaluation with 0-10 scoring, filler word detection (um, ah, like), and instant feedback |
| **📊 Analytics Dashboard** | Post-interview debriefing showing aggregate score, communication metrics, and per-question feedback |
| **🔐 Privacy by Design** | All LLM operations run locally—no cloud dependencies |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      🌐 INTERVIEW.AI PLATFORM                       │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────┐
                        │   🖥️ FRONTEND      │
                        │   (Next.js/React)   │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐  ┌───▼──────┐  ┌───▼────────┐
            │ Resume Upload │  │ Interview │  │ Evaluation │
            │   (page.jsx)  │  │  Arena    │  │ Dashboard  │
            │               │  │(id).jsx   │  │  (page)    │
            └───────┬──────┘  └───┬──────┘  └───┬────────┘
                    │              │            │
                    └──────────────┼────────────┘
                                   │
                ┌──────────────────▼──────────────────┐
                │   🔗 FastAPI Backend (Python)       │
                │   http://localhost:8000             │
                └──────────────────┬──────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼─────────┐    ┌──────────▼──────────┐    ┌──────────▼──────┐
   │  📄 PDF      │    │  🤖 Ollama Llama 3  │    │  🗄️ Supabase   │
   │  Processing  │    │  (Local LLM Engine) │    │  (PostgreSQL)   │
   │ pdfplumber   │    │                      │    │  Candidate DB   │
   └──────────────┘    └─────────────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    🔄 DATA FLOW & PROCESSING PIPELINE               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1️⃣  Resume Upload → 2️⃣  PDF Parse → 3️⃣  Llama 3 Analyze          │
│       ↓                ↓                ↓                            │
│  4️⃣  Store Profile → 5️⃣  Generate Qs → 6️⃣  Start Interview        │
│       ↓                ↓                ↓                            │
│  7️⃣  Voice Capture  → 8️⃣  Transcribe  → 9️⃣  Llama 3 Grade         │
│       ↓                ↓                ↓                            │
│  🔟 Score & Feedback ← Metrics Calc ← Real-time Eval              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### **Frontend (React/Next.js)**
| Component | Technology |
|-----------|-------------|
| Framework | Next.js 14+ / React 18+ |
| Styling | Tailwind CSS (Custom "Tactical Neural" dark mode) |
| State Mgmt | React Hooks (`useState`, `useRef`, `useCallback`) |
| Audio | Web Speech API (`SpeechRecognition`), Audio Playback |
| Networking | Fetch API + Error Handling |

### **Backend (Python/FastAPI)**
| Component | Technology |
|-----------|-------------|
| Framework | FastAPI (async/await) |
| Server | Uvicorn (ASGI) |
| Database | Supabase (PostgreSQL) |
| File IO | `pdfplumber` (PDF parsing) |
| Concurrency | `asyncio`, non-blocking I/O |

### **AI/ML Stack**
| Component | Technology |
|-----------|-------------|
| LLM | Ollama + Llama 3 (local inference) |
| Resume Parsing | Llama 3 (structured extraction) |
| Question Generation | Llama 3 (context-aware prompting) |
| Answer Evaluation | Llama 3 (comparative grading) |
| Speech-to-Text | Web Speech API (browser) + Whisper fallback |

---

## 📊 Interview Workflow

```
┌─────────┐      ┌──────────────┐      ┌───────────┐      ┌─────────┐
│  Start  │  →   │Upload Resume │  →   │Generate   │  →   │ Interview
│Interview│      │& Profile     │      │10 Qs     │      │ Arena
└─────────┘      └──────────────┘      └───────────┘      └────┬────┘
                                                                │
                                    ┌───────────────────────────┤
                                    │                           │
                            ┌───────▼──────────┐      ┌────────▼─────┐
                            │  Play Question   │      │ User Speaks  │
                            │  (Text-to-Speech)│      │ Answer       │
                            └───────┬──────────┘      └────────┬─────┘
                                    │                         │
                                    └────────────┬────────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ Silence Detect  │
                                        │ (2.5s timeout)  │
                                        └────────┬────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ Transcribe      │
                                        │ Audio Input     │
                                        └────────┬────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ Grade Answer    │
                                        │ (Llama 3)       │
                                        └────────┬────────┘
                                                 │
                                  ┌──────No──────┤
                                  │              │
                            ┌─────▼──┐    ┌─────▼──┐
                            │ Next Q? │    │Finished│
                            └─────┬──┘    └────┬───┘
                                  │            │
                            Yes ──┤            │
                                  │            │
                            ┌─────▼──────┐    │
                            │ Q3 of 10... │    │
                            └─────┬──────┘    │
                                  │           │
                                  └─────┬─────┘
                                        │
                                  ┌─────▼──────────┐
                                  │ Analytics      │
                                  │ Dashboard      │
                                  │ Final Score    │
                                  └────────────────┘
```

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- **Node.js 18+** & **npm**
- **Python 3.10+** & **pip**
- **Ollama** installed locally
- **Supabase** account (free tier OK)

### 1️⃣ Clone & Setup
```bash
git clone https://github.com/yourusername/InterviewAI.git
cd InterviewAI
```

### 2️⃣ Backend Setup
```bash
cd Backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3️⃣ Start Ollama & LLM
```bash
ollama pull llama3
ollama serve
# In another terminal:
cd Backend
python app.py  # or: uvicorn app.main:app --reload
```

### 4️⃣ Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

### 5️⃣ Access the App
Open **http://localhost:3000** and upload a resume to get started!

---

## 📦 Project Structure

```
InterviewAI/
├── 📄 README.md                          (This file)
├── 📄 LICENSE                            (MIT)
│
├── 🔧 Backend/
│   ├── app.py                           (FastAPI entry point)
│   ├── requirements.txt                 (Python dependencies)
│   └── [core modules]
│
└── 🎨 frontend/
    ├── package.json                     (NPM dependencies)
    ├── next.config.js                   (Next.js config)
    ├── tailwind.config.js               (Tailwind setup)
    ├── app/
    │   ├── page.jsx                     (Home/Resume upload)
    │   ├── layout.jsx                   (Root layout)
    │   ├── globals.css                  (Global styles)
    │   ├── interview/[id]/page.jsx      (🎙️ Interview Arena)
    │   └── upload/page.jsx              (📄 Resume upload)
    ├── lib/
    │   └── supabaseClient.js            (DB connection)
    └── public/                          (Static assets)
```

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
```

### 3. Environment Configuration
Create a `.env` file in the `Backend/` directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_api_key
OLLAMA_API_BASE=http://localhost:11434
```

### 4. Start the Backend
```bash
# Ensure Ollama is running in another terminal
ollama serve

# Then in Backend directory:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:3000** to begin!

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate-questions/{candidate_id}` | `GET` | Generate 10 questions from candidate profile |
| `/upload-resume` | `POST` | Parse PDF & create candidate profile |
| `/evaluate-answer` | `POST` | Grade transcribed answer (Llama 3) |
| `/get-candidate/{candidate_id}` | `GET` | Retrieve candidate profile & scores |

---

## 🎙️ Key Features Deep Dive

### **Resume Parsing Engine**
The system uses `pdfplumber` to extract text from PDFs, then pipes it through Llama 3 with a structured prompt to identify:
- **Technical Skills** (Languages, frameworks, tools)
- **Work Experience** (Roles, companies, tenure)
- **Projects** (Descriptions, impact)
- **Education** (Degrees, certifications)

```python
# Example: Structured resume parsing
resume_text = extract_pdf(resume_file)
candidate_profile = llama_parse_resume(resume_text)
# Output: {"skills": [...], "experience": [...], "projects": [...]}
```

### **Question Generation**
Llama 3 generates contextual questions using the candidate profile:
- **3-4 Technical Questions** (targeted to their tech stack)
- **3-4 Behavioral Questions** (STAR format)
- **2-3 Scenario-based Questions** (real-world problem solving)

### **Speech Recognition Pipeline**
1. **Browser Web Speech API** captures audio in real-time
2. **Interim results** show live feedback (optional)
3. **Silence detection** (2.5s) auto-submits the answer
4. **Fallback**: OpenAI Whisper for unavailable browsers

### **AI Grading System**
Llama 3 evaluates answers using:
- ✅ **Technical Accuracy** – Does the answer correctly address the question?
- 📊 **Completeness** – Are all key points covered?
- 🎯 **Communication** – Clarity, filler word count, pacing
- 🔍 **Confidence Signals** – Hesitation markers, corrections

**Score Formula:**
```
Final_Score = (Technical_Score × 0.4) + (Communication_Score × 0.3) 
            + (Completeness_Score × 0.2) + (Confidence_Score × 0.1)
```

---

## ⚙️ Configuration & Tuning

### **Ollama Settings**
Adjust inference parameters in your backend config:
```python
# Temperature (0.0 = deterministic, 1.0 = random)
ollama_config = {
    "model": "llama3",
    "temperature": 0.3,  # Lower for grading consistency
    "top_p": 0.9,
}
```

### **Silence Threshold**
Modify auto-submit silence delay (currently 2.5s):
```javascript
// In interview/[id]/page.jsx
const SILENCE_THRESHOLD_MS = 2500; // Adjust as needed
```

### **Question Count**
Change from 10 questions to custom:
```python
# In Backend/app.py
NUM_QUESTIONS = 10  # Modify this value
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Speech Recognition not supported"** | Use Chrome/Edge; Safari has limited support |
| **Ollama connection refused** | Ensure `ollama serve` is running on port 11434 |
| **PDF parsing fails** | Verify PDF is text-based (not scanned image) |
| **Supabase auth error** | Check `.env` credentials and table permissions |
| **Answers showing "undefined"** | Verify speech event results structure (see fix in code) |

---

## 🔒 Privacy & Security

- ✅ **All LLM inference is local** – No data sent to cloud
- ✅ **Resume data stored securely** – Supabase row-level security enabled
- ✅ **Audio transcripts encrypted** – End-to-end encryption in transit
- ✅ **No third-party tracking** – GDPR compliant

---

## 📈 Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| **Resume Parsing** | < 5s | Depends on resume length |
| **Question Generation** | < 8s | Llama 3 inference time |
| **Answer Transcription** | < 2s | Web Speech API latency |
| **Grading** | < 6s | Llama 3 evaluation |
| **Total Interview Time** | ~25-35 min | 10 questions × 2-3 min each |

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 Future Roadmap

- [ ] **Multi-language Support** (Spanish, Mandarin, German, etc.)
- [ ] **Video Analysis** – Assess body language & eye contact
- [ ] **Advanced NLP** – Semantic similarity scoring
- [ ] **Interview Analytics Dashboard** – Aggregate candidate metrics
- [ ] **Candidate Ranking** – Auto-rank candidates by performance
- [ ] **Mobile App** – React Native version
- [ ] **Deployment Templates** – Docker, Kubernetes configs
- [ ] **Custom Question Pools** – Upload custom question sets

---

## 📄 License

This project is licensed under the **MIT License** – see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Ollama & Llama 3** – Meta AI for incredible open-source LLM
- **FastAPI** – Modern Python web framework
- **Next.js** – React framework for production
- **Supabase** – Open-source Firebase alternative
- **Web Speech API** – Browser-native speech recognition

---

## 📧 Contact & Support

- **Issues**: Open a GitHub issue for bug reports
- **Discussions**: Start a discussion for feature requests
- **Email**: support@interview-ai.local

---

<div align="center">

**Built with ❤️ by AI Enthusiasts | Stars are appreciated ⭐**

[Back to Top](#-interviewai--neural-assessment-protocol)

</div>