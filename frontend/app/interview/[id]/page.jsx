"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

// The strict state machine for the interview loop
const INTERVIEW_STATE = {
  IDLE: "idle",
  ASKING: "asking",
  LISTENING: "listening",
  PROCESSING: "processing",
  EVALUATING: "evaluating",
  TRANSITIONING: "transitioning",
  COMPLETE: "complete",
};

const SILENCE_THRESHOLD_MS = 6500; // 6.5 seconds of silence

export default function InterviewArena() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id;

  // --- REACT STATE (For UI rendering) ---
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interviewState, setInterviewState] = useState(INTERVIEW_STATE.IDLE);
  
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [countdownValue, setCountdownValue] = useState(5);

  // --- MUTABLE REFS (For bulletproof logic behind the scenes) ---
  const stateRef = useRef(INTERVIEW_STATE.IDLE);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const lastSpeechTimeRef = useRef(Date.now());
  const submittingRef = useRef(false); 
  
  // Transcript mirrors (prevents the "silence bug")
  const liveTranscriptRef = useRef("");
  const finalTranscriptRef = useRef("");

  // Question & Index mirrors (prevents the "premature end bug")
  const currentIndexRef = useRef(0);
  const questionsRef = useRef([]);

  // Sync state to Refs so timers always know the exact current reality
  useEffect(() => {
    stateRef.current = interviewState;
    currentIndexRef.current = currentIndex;
    questionsRef.current = questions;
  }, [interviewState, currentIndex, questions]);

  // ------------------------------------------------------------------
  // 1. INITIALIZATION: Fetch Questions
  // ------------------------------------------------------------------
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch(`http://localhost:8000/generate-questions/${candidateId}`);
        const data = await response.json();
        
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          questionsRef.current = data.questions; // Force update ref immediately
          
          // Wait 1 second, then start the first question
          setTimeout(() => askQuestion(data.questions[0]), 1000);
        } else {
          console.error("No questions found.");
        }
      } catch (error) {
        console.error("Failed to load questions:", error);
      }
    };
    loadQuestions();
  }, [candidateId]);

  // ------------------------------------------------------------------
  // 2. THE TTS ENGINE: AI Asks the Question
  // ------------------------------------------------------------------
  const askQuestion = (text) => {
    setInterviewState(INTERVIEW_STATE.ASKING);
    setLiveTranscript("");
    setFinalTranscript("");
    liveTranscriptRef.current = "";
    finalTranscriptRef.current = "";
    setEvaluation(null);
    submittingRef.current = false;

    if (!("speechSynthesis" in window)) {
      startListening(); 
      return;
    }

    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        startListening(); 
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        startListening();
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // ------------------------------------------------------------------
  // 3. THE EARS: Start the Microphone
  // ------------------------------------------------------------------
  const startListening = useCallback(() => {
    if (stateRef.current === INTERVIEW_STATE.COMPLETE) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please use Chrome.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setInterviewState(INTERVIEW_STATE.LISTENING);
      lastSpeechTimeRef.current = Date.now(); 
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }

      setLiveTranscript(interim);
      liveTranscriptRef.current = interim;

      if (final) {
        setFinalTranscript((prev) => prev + final);
        finalTranscriptRef.current += final;
      }

      lastSpeechTimeRef.current = Date.now();
    };

    recognition.onend = () => {
      if (stateRef.current === INTERVIEW_STATE.LISTENING && !submittingRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  // ------------------------------------------------------------------
  // 4. THE WATCHDOG: Silence Detection Polling
  // ------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      if (stateRef.current === INTERVIEW_STATE.LISTENING && !submittingRef.current) {
        const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
        if (timeSinceLastSpeech > SILENCE_THRESHOLD_MS) {
          submitAnswer();
        }
      }
    }, 300);

    return () => clearInterval(timer);
  }, []);

  // ------------------------------------------------------------------
  // 5. THE SUBMISSION: Send to FastAPI & Llama 3
  // ------------------------------------------------------------------
  const submitAnswer = async () => {
    if (submittingRef.current) return; 
    submittingRef.current = true;
    setInterviewState(INTERVIEW_STATE.PROCESSING);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const answerText = (finalTranscriptRef.current + " " + liveTranscriptRef.current).trim();
    const currentIdx = currentIndexRef.current; // USING REF
    const currentQuestion = questionsRef.current[currentIdx]; // USING REF

    const formData = new FormData();
    formData.append("answer_text", answerText); 
    formData.append("question_index", currentIdx); 

    try {
      const response = await fetch(`http://localhost:8000/process-answer/${candidateId}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.evaluation) {
        setEvaluation(data.evaluation);
        setInterviewState(INTERVIEW_STATE.EVALUATING);
        
        setInterviewHistory(prev => [...prev, {
          question: currentQuestion,
          transcript: data.transcript,
          analytics: data.analytics,
          evaluation: data.evaluation
        }]);

        setTimeout(() => triggerTransition(), 4000);
      } else {
        triggerTransition();
      }
    } catch (error) {
      console.error("Backend Error:", error);
      triggerTransition();
    }
  };

  // ------------------------------------------------------------------
  // 6. THE TRANSITION: Countdown to Next Question
  // ------------------------------------------------------------------
  const triggerTransition = () => {
    const currentIdx = currentIndexRef.current; // USING REF
    const totalQuestions = questionsRef.current.length; // USING REF

    if (currentIdx >= totalQuestions - 1) {
      setInterviewState(INTERVIEW_STATE.COMPLETE);
      return;
    }

    setInterviewState(INTERVIEW_STATE.TRANSITIONING);
    setCountdownValue(3); 

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      
      if (count <= 0) {
        clearInterval(interval);
        
        const nextIdx = currentIdx + 1;
        setCurrentIndex(nextIdx); 
        currentIndexRef.current = nextIdx; // Update Ref immediately
        
        askQuestion(questionsRef.current[nextIdx]); 
      }
    }, 1000);
  };


  // ------------------------------------------------------------------
  // RENDER: Loading Screen
  // ------------------------------------------------------------------
  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-mono animate-pulse">Initializing Neural Assessment...</p>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: Post-Interview Analytics Dashboard
  // ------------------------------------------------------------------
  if (interviewState === INTERVIEW_STATE.COMPLETE) {
    const totalScore = interviewHistory.reduce((sum, item) => sum + item.evaluation.score_out_of_10, 0);
    const avgScore = interviewHistory.length > 0 ? (totalScore / interviewHistory.length).toFixed(1) : 0;
    const totalFillers = interviewHistory.reduce((sum, item) => sum + (item.analytics?.filler_words_detected || 0), 0);

    return (
      <main className="min-h-screen bg-slate-950 text-cyan-50 p-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 uppercase">Assessment Complete</h1>
            <p className="text-slate-400 font-mono tracking-widest uppercase">Llama 3 Final Debriefing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-lg">
              <span className="text-slate-400 text-sm uppercase tracking-widest">Overall Score</span>
              <div className={`text-6xl font-bold mt-2 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] ${avgScore >= 7 ? "text-green-400" : avgScore >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                {avgScore}<span className="text-3xl text-slate-500">/10</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-lg">
              <span className="text-slate-400 text-sm uppercase tracking-widest">Filler Words Detected</span>
              <div className="text-6xl font-bold text-orange-400 mt-2 drop-shadow-[0_0_15px_rgba(251,146,60,0.2)]">{totalFillers}</div>
            </div>
          </div>

          <div className="space-y-6 h-[500px] overflow-y-auto pr-2">
            {interviewHistory.map((item, idx) => (
              <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-md hover:border-cyan-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-cyan-300 font-bold text-lg max-w-[85%]"><span className="text-slate-500 mr-2">Q{idx + 1}:</span>{item.question}</h4>
                  <span className={`px-4 py-1 rounded-lg font-bold ${item.evaluation.score_out_of_10 >= 7 ? 'bg-green-500/20 text-green-400' : item.evaluation.score_out_of_10 >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {item.evaluation.score_out_of_10}/10
                  </span>
                </div>
                <div className="bg-slate-950 rounded-lg p-4 mb-4 border border-slate-800">
                  <p className="text-sm text-slate-400 italic">"{item.transcript || "[Silence Detected]"}"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-cyan-500 uppercase tracking-widest mb-1 font-bold">Tech Feedback</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.evaluation.technical_feedback}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-500 uppercase tracking-widest mb-1 font-bold">Comms Feedback</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.evaluation.communication_feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/')} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
            Return to Terminal
          </button>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: Main Interview Arena
  // ------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-slate-950 text-cyan-50 flex p-6 gap-6 font-sans">
      
      {/* LEFT: AI Avatar & Question */}
      <div className="w-1/2 flex flex-col gap-6">
        
        {/* State Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-center font-bold tracking-widest uppercase transition-colors duration-500 shadow-lg
          ${interviewState === INTERVIEW_STATE.ASKING ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : ''}
          ${interviewState === INTERVIEW_STATE.LISTENING ? 'bg-red-900/30 border-red-500 text-red-400 animate-pulse' : ''}
          ${interviewState === INTERVIEW_STATE.PROCESSING ? 'bg-yellow-900/30 border-yellow-500 text-yellow-400' : ''}
          ${interviewState === INTERVIEW_STATE.EVALUATING ? 'bg-green-900/30 border-green-500 text-green-400' : ''}
          ${interviewState === INTERVIEW_STATE.TRANSITIONING ? 'bg-slate-800 border-slate-600 text-slate-300' : ''}
        `}>
          {interviewState}
        </div>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center relative shadow-xl overflow-hidden">
          
          {/* Transition Overlay Countdown */}
          {interviewState === INTERVIEW_STATE.TRANSITIONING && (
            <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
              <p className="text-slate-400 mb-2 uppercase tracking-widest">Next Question In</p>
              <div className="text-9xl font-bold text-cyan-400 animate-pulse">{countdownValue}</div>
            </div>
          )}

          {/* AI Orb */}
          <div className="relative flex items-center justify-center w-40 h-40 mb-8">
            <div className={`absolute inset-0 rounded-full blur-3xl opacity-30 ${interviewState === INTERVIEW_STATE.LISTENING ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
            <div className={`w-24 h-24 rounded-full shadow-[0_0_40px_#67e8f9] transition-all duration-300 ${interviewState === INTERVIEW_STATE.LISTENING ? 'bg-red-500 scale-110' : 'bg-cyan-400'}`}></div>
          </div>

          {/* Current Question */}
          <div className="text-center w-full max-w-lg z-10">
            <p className="text-sm text-slate-500 uppercase tracking-widest mb-4">Question {currentIndex + 1} / {questions.length}</p>
            <p className="text-2xl font-bold text-cyan-50 leading-relaxed drop-shadow-md">{questions[currentIndex]}</p>
          </div>
        </div>
      </div>

      {/* RIGHT: User Interface */}
      <div className="w-1/2 flex flex-col gap-6">
        
        {/* Transcript Box */}
        <div className="h-1/2 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative flex flex-col shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Live Neural Transcript</p>
            {interviewState === INTERVIEW_STATE.LISTENING && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xs font-mono text-red-500">REC</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <p className="text-lg text-slate-300 font-mono leading-relaxed">
              {finalTranscript}
              <span className="text-cyan-400 bg-cyan-900/20">{liveTranscript}</span>
            </p>
          </div>

          {interviewState === INTERVIEW_STATE.LISTENING && (
            <div className="absolute bottom-6 right-6 z-10">
               <button 
                onClick={submitAnswer}
                className="px-6 py-3 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all hover:scale-105 backdrop-blur-sm"
               >
                 Done Speaking
               </button>
            </div>
          )}
        </div>

        {/* Real-time Feedback Box */}
        <div className="h-1/2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Instant AI Evaluation</p>
          
          {interviewState === INTERVIEW_STATE.EVALUATING && evaluation ? (
            <div className="animate-fadeIn space-y-4 overflow-y-auto flex-1">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <span className="text-xl font-bold text-slate-300 uppercase tracking-wider">{evaluation.accuracy_level}</span>
                <span className={`text-5xl font-bold drop-shadow-md ${evaluation.score_out_of_10 >= 7 ? 'text-green-400' : 'text-red-400'}`}>
                  {evaluation.score_out_of_10}/10
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed"><span className="text-cyan-500 font-bold mr-2 uppercase text-xs">Tech:</span>{evaluation.technical_feedback}</p>
              <p className="text-sm text-slate-300 leading-relaxed"><span className="text-purple-500 font-bold mr-2 uppercase text-xs">Comms:</span>{evaluation.communication_feedback}</p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 font-mono">
              [ Awaiting User Input ]
            </div>
          )}
        </div>
      </div>

    </main>
  );
}