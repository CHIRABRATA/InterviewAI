"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function InterviewArena() {
  const params = useParams();
  const candidateId = params.id;

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [evaluation, setEvaluation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [allScores, setAllScores] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isSpeakingRef = useRef(false);

  // Load questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/generate-questions/${candidateId}`);
        const data = await response.json();
        
        console.log("Questions loaded:", data);
        
        if (data.error) {
          console.error("Backend error:", data.error);
          if (data.debug) console.error("Debug info:", data.debug);
          return;
        }
        
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
          // Speak first question after a short delay
          setTimeout(() => {
            speakQuestion(data.questions[0]);
          }, 500);
        } else {
          console.error("No questions found or invalid format:", data);
        }
      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [candidateId]);

  // Text-to-speech function with anti-interrupt logic
  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) {
      console.error("Speech Synthesis not supported");
      return;
    }

    // Only speak if not already speaking
    if (isSpeakingRef.current) {
      console.log("TTS already in progress, skipping");
      return;
    }

    try {
      isSpeakingRef.current = true;
      
      // Cancel any previous speech
      window.speechSynthesis.cancel();
      
      // Small delay to ensure cancel completes
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
          console.log("TTS Started");
        };
        
        utterance.onend = () => {
          console.log("TTS Ended");
          isSpeakingRef.current = false;
        };
        
        utterance.onerror = (error) => {
          console.error("TTS Error:", error);
          isSpeakingRef.current = false;
        };
        
        window.speechSynthesis.speak(utterance);
        console.log("Speaking:", text);
      }, 100);
    } catch (error) {
      console.error("TTS Exception:", error);
      isSpeakingRef.current = false;
    }
  };

  // Auto-skip timer
  useEffect(() => {
    if (!isRecording || submitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSkip();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording, submitted]);

  // Countdown timer between questions
  useEffect(() => {
    if (!countdownActive) return;

    const timer = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          setCountdownActive(false);
          setShowCountdown(false);
          moveToNextQuestion();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive]);

  // Start recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstart = () => {
        console.log("Recording started");
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTimeRemaining(10);
      console.log("Audio recording initiated");
    } catch (error) {
      console.error("Microphone access denied or failed:", error);
      alert("Please allow microphone access to record your answer");
    }
  };

  // Stop recording and submit
  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          await submitAnswer(audioBlob);
          resolve();
        };
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      }
    });
  };

  // Submit answer for grading
  const submitAnswer = async (audioBlob) => {
    console.log("submitAnswer called with blob size:", audioBlob.size);
    setSubmitted(true);

    const formData = new FormData();
    formData.append("audio_file", audioBlob);
    formData.append("question_index", currentQuestionIndex);

    console.log("Sending to backend:", {
      candidate_id: candidateId,
      question_index: currentQuestionIndex,
      audio_size: audioBlob.size,
    });

    try {
      const response = await fetch(
        `http://localhost:8000/process-answer/${candidateId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      console.log("Backend response:", data);
      
      if (data.evaluation) {
        setEvaluation(data.evaluation);
        setAllScores((prev) => [...prev, data.evaluation.score_out_of_10]);
      } else if (data.error) {
        console.error("Backend error:", data.error);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    }

    // Start countdown to next question
    setShowCountdown(true);
    setCountdownActive(true);
    setCountdownValue(5);
  };

  const handleSkip = () => {
    if (!submitted) {
      // Stop recording first if still going
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          submitAnswer(audioBlob);
        };
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      } else {
        // If not recording, just create skip evaluation
        setSubmitted(true);
        setEvaluation({
          score_out_of_10: 0,
          accuracy_level: "Skipped",
          technical_feedback: "No response provided within time limit.",
          communication_feedback: "Question was skipped due to timeout.",
        });
        setAllScores((prev) => [...prev, 0]);
        setShowCountdown(true);
        setCountdownActive(true);
        setCountdownValue(5);
      }
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSubmitted(false);
      setEvaluation(null);
      setTimeRemaining(10);
      
      setTimeout(() => {
        speakQuestion(questions[nextIndex]);
      }, 500);
      
      setTimeout(() => {
        startRecording();
      }, 1000);
    } else {
      setShowCountdown(false);
    }
  };

  // Auto-start recording on question change
  useEffect(() => {
    if (questions.length > 0 && !submitted && !isRecording && !isLoading && currentQuestionIndex < questions.length) {
      console.log("Auto-starting recording for question:", currentQuestionIndex);
      startRecording();
    }
  }, [currentQuestionIndex, questions, submitted, isLoading]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-mono">Loading interview questions...</p>
          <p className="text-sm text-slate-400 mt-4">Candidate ID: {candidateId}</p>
          <p className="text-xs text-slate-600 mt-2">Check browser console (F12) for details</p>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-50">
        <div className="text-center max-w-lg bg-red-500/10 border border-red-500/50 rounded-lg p-6">
          <p className="text-xl font-mono text-red-400 mb-4">⚠️ Error Loading Questions</p>
          <p className="text-sm text-slate-300 mb-4">No questions were returned from the backend.</p>
          <p className="text-xs text-slate-400 mb-4">
            Make sure:<br/>
            ✓ Backend is running on http://localhost:8000<br/>
            ✓ Resume was uploaded successfully<br/>
            ✓ Ollama is running with llama3 model<br/>
            ✓ Check F12 console for errors
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // Interview complete
  if (currentQuestionIndex >= questions.length && submitted) {
    const avgScore = (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-50 p-6">
        <div className="max-w-2xl bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center">
          <h1 className="text-4xl font-bold text-cyan-400 mb-4">Interview Complete!</h1>
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-blue-500 my-8">
            {avgScore}/10
          </div>
          <p className="text-slate-400 mb-8">Average Score: {avgScore} out of 10</p>
          <div className="space-y-2 text-left bg-slate-800/50 p-4 rounded-xl mb-8 max-h-96 overflow-y-auto">
            {allScores.map((score, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-400">Question {idx + 1}:</span>
                <span className={score >= 7 ? "text-green-400" : score >= 5 ? "text-yellow-400" : "text-red-400"}>
                  {score}/10
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.location.href = "/"}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded-xl transition-all"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <main className="min-h-screen bg-slate-950 flex p-6 font-sans text-cyan-50 gap-6">
      {/* Left Side: AI & Question Display */}
      <div className="w-1/2 flex flex-col gap-6">
        {/* Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-400">Question Progress</span>
            <span className="text-sm text-cyan-400 font-bold">
              {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* AI Visualization */}
        <div className="h-2/3 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
          <div className="absolute top-4 left-4 flex gap-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-slate-600"}`}></div>
            <span className={`text-xs ${isRecording ? "text-red-500" : "text-slate-500"} font-mono font-bold tracking-widest`}>
              {isRecording ? "REC" : "OFF"}
            </span>
          </div>

          {/* Animated AI Orb */}
          <div className="relative flex items-center justify-center w-40 h-40 mb-6">
            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-3xl animate-pulse opacity-30"></div>
            <div className={`w-20 h-20 rounded-full shadow-[0_0_30px_#67e8f9] ${isRecording ? "animate-bounce bg-red-500/50" : "bg-cyan-400"}`}></div>
          </div>

        {/* Current Question */}
          <div className="text-center max-h-32 overflow-y-auto px-4">
            <p className="text-sm text-slate-400 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
            {currentQuestion ? (
              <p className="text-lg font-mono text-cyan-300 leading-relaxed">
                "{currentQuestion}"
              </p>
            ) : (
              <p className="text-red-400">Question not loaded</p>
            )}
          </div>

          {/* Timer */}
          <div className="mt-6 text-5xl font-mono font-bold text-cyan-400">
            {timeRemaining}s
          </div>

          {/* Submission Status */}
          {submitted && evaluation && (
            <div className="mt-6 text-center">
              <div className={`text-3xl font-bold ${evaluation.score_out_of_10 >= 7 ? "text-green-400" : evaluation.score_out_of_10 >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                {evaluation.score_out_of_10}/10
              </div>
              <p className="text-sm text-slate-400 mt-2">{evaluation.accuracy_level}</p>
            </div>
          )}
        </div>

        {/* Feedback Box */}
        {submitted && evaluation && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <h4 className="text-cyan-400 font-bold mb-2">Feedback:</h4>
            <p className="text-xs text-slate-300 mb-2">{evaluation.technical_feedback}</p>
            <p className="text-xs text-slate-400">{evaluation.communication_feedback}</p>
          </div>
        )}
      </div>

      {/* Right Side: Controls & Countdown */}
      <div className="w-1/2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between relative">
        {/* Webcam Placeholder */}
        <div className="w-full h-[60%] bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 relative overflow-hidden">
          {isRecording && (
            <div className="absolute inset-0 border-4 border-red-500/50 rounded-2xl animate-pulse"></div>
          )}
          <p className="text-slate-600 font-mono text-center px-4">
            {isRecording ? "🎤 Recording..." : "[ WEBCAM FEED READY ]"}
          </p>
        </div>

        {/* Countdown Overlay */}
        {showCountdown && countdownActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-3xl z-50">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-4">Next question in</p>
              <div className="text-8xl font-bold text-cyan-400 animate-pulse">
                {countdownValue}
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-col gap-4 mt-6">
          {!submitted ? (
            <>
              <button
                onClick={() => handleSkip()}
                className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase transition-colors text-sm"
              >
                Skip Question
              </button>
              <button
                onClick={() => stopRecording()}
                className="w-full px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all text-sm"
              >
                Stop & Submit Answer
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-cyan-400 font-bold">Answer Submitted!</p>
              <p className="text-sm text-slate-400 mt-1">Moving to next question...</p>
            </div>
          )}
        </div>

        {/* Score Summary */}
        {allScores.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 mt-4">
            <h4 className="text-cyan-400 text-sm font-bold mb-3">Scores So Far:</h4>
            <div className="grid grid-cols-5 gap-2">
              {allScores.map((score, idx) => (
                <div
                  key={idx}
                  className={`text-center py-2 rounded-lg text-xs font-bold ${
                    score >= 7
                      ? "bg-green-500/20 text-green-400"
                      : score >= 5
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  Q{idx + 1}<br />{score}/10
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

