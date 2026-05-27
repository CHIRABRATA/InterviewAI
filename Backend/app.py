from fastapi import FastAPI, File, UploadFile
import pdfplumber
import ollama
import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import shutil
import tempfile
from fastapi import Form
import re
from fastapi.middleware.cors import CORSMiddleware

# Try to import whisper, but make it optional
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    whisper = None

# Load environment variables from .env file
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()

# Add CORS middleware to allow Next.js frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (change to localhost:3000 in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-load Whisper model on first use
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        print("Loading Whisper model... this might take a few seconds.")
        whisper_model = whisper.load_model("base")
        print("Whisper model loaded!")
    return whisper_model

@app.get("/")
async def root():
    return {"message": "Welcome to the Interview AI Backend!"}


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "Only PDF files are allowed."}

    try:
        # 1. Extract text
        with pdfplumber.open(file.file) as pdf:
            text = ""
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

        if not text.strip():
            return {"error": "Could not extract text from this PDF."}

        # 2. Ask AI to parse
        prompt = f"""
        You are an expert HR AI assistant. Read the following resume text and extract the key information.
        You MUST return ONLY a valid JSON object. Do not include any explanations or markdown formatting outside the JSON.
        
        Required JSON structure:
        {{
            "name": "Candidate Name",
            "skills": ["skill1", "skill2"],
            "projects": [
                {{"title": "Project Name", "description": "Brief summary"}}
            ],
            "experience": [
                {{"role": "Job Title", "company": "Company Name", "duration": "Time period"}}
            ]
        }}

        Resume Text:
        {text}
        """

        response = ollama.chat(
            model='llama3', 
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )

        ai_response_text = response['message']['content']
        structured_data = json.loads(ai_response_text)

        # 3. Save to Supabase
        db_response = supabase.table('candidates').insert({
            "name": structured_data.get("name", "Unknown"),
            "skills": structured_data.get("skills", []),
            "projects": structured_data.get("projects", []),
            "experience": structured_data.get("experience", []),
            "raw_resume_text": text
        }).execute()

        # 4. Return success
        return {
            "status": "success",
            "message": "Resume parsed and saved to database!",
            "db_id": db_response.data[0]['id'],
            "candidate_profile": structured_data
        }

    except json.JSONDecodeError:
        return {"error": "AI failed to return valid JSON.", "raw_output": ai_response_text}
    except Exception as e:
        return {"error": str(e)}


@app.get("/generate-questions/{candidate_id}")
async def generate_questions(candidate_id: str):
    try:
        # 1. Fetch the candidate's JSON profile from Supabase
        candidate_res = supabase.table('candidates').select('*').eq('id', candidate_id).execute()
        
        if not candidate_res.data:
            return {"error": "Candidate not found in database."}
            
        candidate_data = candidate_res.data[0]
        
        # 2. Prepare the Prompt to generate exactly 10 questions
        prompt = f"""
        You are an expert technical interviewer. Review this candidate's profile:
        Name: {candidate_data.get('name')}
        Skills: {candidate_data.get('skills')}
        Projects: {candidate_data.get('projects')}
        Experience: {candidate_data.get('experience')}

        Generate exactly 10 interview questions for this candidate. 
        - 2 Introduction/Behavioral questions.
        - 5 Technical questions based specifically on their skills and projects.
        - 3 Scenario-based/Problem-solving questions.

        You MUST return ONLY a valid JSON array of strings. Do not include any formatting or explanations.
        
        Example format:
        [
            "Tell me about yourself and your experience.",
            "I see you used React in your project. Can you explain how React hooks work?",
            "How would you optimize a slow API endpoint in FastAPI?"
        ]
        """

        # 3. Ask Ollama to generate the questions (forcing JSON output)
        response = ollama.chat(
            model='llama3', 
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )

        # 4. Parse the AI response
        ai_response_text = response['message']['content']
        print(f"DEBUG: Raw AI response: {ai_response_text[:200]}")  # Log first 200 chars
        
        parsed_response = json.loads(ai_response_text)
        print(f"DEBUG: Parsed response type: {type(parsed_response)}, keys: {parsed_response.keys() if isinstance(parsed_response, dict) else 'N/A'}")
        
        # Handle multiple possible response formats from AI
        questions_array = None
        
        if isinstance(parsed_response, list):
            # Direct array
            questions_array = parsed_response
        elif isinstance(parsed_response, dict):
            # Check for various possible keys
            if "questions" in parsed_response:
                questions_array = parsed_response["questions"]
            elif len(parsed_response) == 1:
                # Single key dict, grab its value
                value = list(parsed_response.values())[0]
                if isinstance(value, list):
                    questions_array = value
        

        if not questions_array or not isinstance(questions_array, list) or len(questions_array) == 0:
            print(f"ERROR: Could not extract questions array. Raw: {ai_response_text}")
            return {"error": "AI returned unexpected format for questions.", "debug": ai_response_text[:500]}

        # 5. Save the questions to Supabase so we have a record of the interview
        supabase.table('candidates').update({
            "generated_questions": questions_array
        }).eq('id', candidate_id).execute()

        # 6. Return the questions to the frontend
        return {
            "status": "success",
            "total_questions": len(questions_array),
            "questions": questions_array
        }

    except json.JSONDecodeError:
        return {"error": "AI failed to return valid JSON list."}
    except Exception as e:
        return {"error": str(e)}


@app.post("/process-answer/{candidate_id}")
async def process_answer(
    candidate_id: str, 
    question_index: int = Form(...), 
    audio_file: UploadFile = File(...)
):
    print(f"\n=== PROCESS ANSWER CALLED ===")
    print(f"Candidate ID: {candidate_id}")
    print(f"Question Index: {question_index}")
    print(f"Audio File: {audio_file.filename}, Size: {audio_file.size}")
    
    try:
        # 1. Check if Whisper is available
        if not WHISPER_AVAILABLE:
            print("ERROR: Whisper not available")
            return {"error": "Whisper module not available. Please install openai-whisper."}
        
        # 2. Fetch the actual question from Supabase so the AI knows what to grade
        candidate_res = supabase.table('candidates').select('generated_questions').eq('id', candidate_id).execute()
        if not candidate_res.data or not candidate_res.data[0].get('generated_questions'):
            print(f"ERROR: Questions not found for candidate {candidate_id}")
            return {"error": "Questions not found for this candidate."}
            
        questions_list = candidate_res.data[0]['generated_questions']
        
        if question_index >= len(questions_list):
            print(f"ERROR: Question index {question_index} out of range (total: {len(questions_list)})")
            return {"error": "Question index out of range."}
            
        question_text = questions_list[question_index]
        print(f"Question: {question_text[:100]}...")

        # 3. Process the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            shutil.copyfileobj(audio_file.file, temp_audio)
            temp_file_path = temp_audio.name

        print(f"Audio saved to: {temp_file_path}")
        
        model = get_whisper_model()
        result = model.transcribe(
            temp_file_path,
            initial_prompt="Um, uh, well, like, you know, I literally mean, basically..."
        )
        transcript = result["text"]
        print(f"Transcript: {transcript[:100]}...")

        clean_words = re.findall(r'\b\w+\b', transcript.lower())
        filler_words = ["um", "uh", "like", "literally", "basically", "well", "hmm", "ah", "you know"]
        filler_count = sum(1 for word in clean_words if word in filler_words)
        
        penalty = filler_count * 5
        confidence_score = max(0, 100 - penalty)
        os.remove(temp_file_path)
        print(f"Filler words: {filler_count}, Confidence: {confidence_score}")

        # 4. THE AI JUDGE: Grade the answer using Llama 3
        evaluation_prompt = f"""
        You are a strict but fair Senior Technical Interviewer. Evaluate the candidate's answer.
        
        Interview Question: "{question_text}"
        Candidate's Answer: "{transcript}"
        Filler words used: {filler_count}
        
        Evaluate the technical accuracy, completeness, and clarity of their answer.
        If the answer is wrong, irrelevant, or too short, give it a low score.
        
        You MUST return ONLY a valid JSON object. Do not include any markdown formatting.
        
        Required JSON structure:
        {{
            "score_out_of_10": 0,
            "accuracy_level": "Correct", 
            "technical_feedback": "Explain exactly what they got right, what was wrong, and what they missed.",
            "communication_feedback": "Brief note on their delivery and filler word usage."
        }}
        """
        
        try:
            llm_response = ollama.chat(
                model='llama3', 
                messages=[{'role': 'user', 'content': evaluation_prompt}],
                format='json'  # Force strict JSON output
            )
            ai_evaluation = json.loads(llm_response['message']['content'])
            print(f"AI Evaluation: Score={ai_evaluation.get('score_out_of_10')}")
        except Exception as e:
            print(f"ERROR in AI grading: {str(e)}")
            ai_evaluation = {
                "score_out_of_10": 0,
                "accuracy_level": "Error",
                "technical_feedback": "AI grading failed to generate properly.",
                "communication_feedback": "N/A"
            }

        # 5. Return complete analysis
        result = {
            "status": "success",
            "question_index": question_index,
            "question_asked": question_text,
            "transcript": transcript,
            "analytics": {
                "total_words": len(clean_words),
                "filler_words_detected": filler_count,
                "estimated_confidence_score": confidence_score,
            },
            "evaluation": ai_evaluation
        }
        print(f"=== RESPONSE SENT: {result['status']} ===\n")
        return result

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)