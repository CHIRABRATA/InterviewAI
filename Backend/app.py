from fastapi import FastAPI, File, UploadFile
import pdfplumber
import ollama
import json

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Resume Parser API. Use the /upload/ endpoint to POST your PDF resumes."}


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "Only PDF files are allowed."}

    try:
        # 1. Extract text from the PDF
        with pdfplumber.open(file.file) as pdf:
            text = ""
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

        if not text.strip():
            return {"error": "Could not extract text from this PDF."}

        # 2. Prepare the prompt for the AI
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

        # 3. Send to local Ollama model
        # Note: Make sure Ollama is running in the background on your PC!
        response = ollama.chat(
            model='llama3', 
            messages=[{'role': 'user', 'content': prompt}],
            format='json' # This forces Ollama to output valid JSON
        )

        # 4. Parse the AI response into a Python dictionary
        ai_response_text = response['message']['content']
        structured_data = json.loads(ai_response_text)

        # 5. Return the clean data to the frontend
        return {
            "filename": file.filename, 
            "status": "success",
            "candidate_profile": structured_data
        }

    except json.JSONDecodeError:
        return {"error": "AI failed to return valid JSON.", "raw_output": ai_response_text}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)