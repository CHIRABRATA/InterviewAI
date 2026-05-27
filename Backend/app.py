from fastapi import FastAPI, File, UploadFile
import pdfplumber
import ollama
import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()
@app.get("/")
async def root():
    return {"message": "Welcome to the Interview AI Backend!"}


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
        questions_array = json.loads(ai_response_text)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)