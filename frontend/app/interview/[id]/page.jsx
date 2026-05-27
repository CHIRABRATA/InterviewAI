"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

// State constants for interview flow
const INTERVIEW_STATE = {
  IDLE: "idle",
  ASKING: "asking",
  LISTENING: "listening",
  PROCESSING: "processing",
  EVALUATING: "evaluating",
  COMPLETE: "complete",
};

const SILENCE_THRESHOLD_MS = 2500; // 2.5 seconds of silence to auto-submit

export default function InterviewArena() {
  const params = useParams();
  const candidateId = params.id;

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewState, setInterviewState] = useState(INTERVIEW_STATE.IDLE);
  const [evaluation, setEvaluation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [allScores, setAllScores] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);

  // Refs for speech recognition and silence detection
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const lastSpeechTimeRef = useRef(Date.now());
  const audioChunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setInterviewState(INTERVIEW_STATE.LISTENING);
      lastSpeechTimeRef.current = Date.now();
      setLiveTranscript("");
      setFinalTranscript("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
          lastSpeechTimeRef.current = Date.now();
        } else {
          interim += transcript;
        }
      }

      setLiveTranscript(interim);
      if (final) {
        setFinalTranscript((prev) => prev + final);
      }

      // Reset silence timer on speech detected
      if (interim || final) {
        lastSpeechTimeRef.current = Date.now();
        clearTimeout(silenceTimerRef.current);
        startSilenceDetectionTimer();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (
        event.error === "no-speech" ||
        event.error === "audio-capture" ||
        event.error === "network"
      ) {
        handleSilenceTimeout();
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      clearTimeout(silenceTimerRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimeout(silenceTimerRef.current);
    };
  }, []);

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
            setInterviewState(INTERVIEW_STATE.ASKING);
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

  // Start silence detection timer
  const startSilenceDetectionTimer = () => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      handleSilenceTimeout();
    }, SILENCE_THRESHOLD_MS);
  };

  // Handle silence timeout (auto-submit)
  const handleSilenceTimeout = async () => {
    console.log("Silence detected, auto-submitting answer");
    setInterviewState(INTERVIEW_STATE.PROCESSING);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Use the transcript as the "answer"
    const answerText = finalTranscript || liveTranscript || "[No response]";
    await submitAnswer(answerText);
  };

  // Text-to-speech function
  const speakQuestion = (text) => {
    if (!("speechSynthesis" in window)) {
      console.error("Speech Synthesis not supported");
      return;
    }

    if (isSpeakingRef.current) {
      console.log("TTS already in progress, skipping");
      return;
    }

    try {
      isSpeakingRef.current = true;
      window.speechSynthesis.cancel();

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
          // Start listening after question is spoken
          startListening();
        };

        utterance.onerror = (error) => {
          console.error("TTS Error:", error);
          isSpeakingRef.current = false;
          startListening();
        };

        window.speechSynthesis.speak(utterance);
        console.log("Speaking:", text);
      }, 100);
    } catch (error) {
      console.error("TTS Exception:", error);
      isSpeakingRef.current = false;
      startListening();
    }
  };

  // Start listening for user response
  const startListening = () => {
    if (recognitionRef.current && interviewState !== INTERVIEW_STATE.COMPLETE) {
      try {
        recognitionRef.current.start();
        setFinalTranscript("");
        setLiveTranscript("");
        startSilenceDetectionTimer();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  };

  // Submit answer (transcript-based)
  const submitAnswer = async (answerText) => {
    console.log("submitAnswer called with text:", answerText.substring(0, 100));
    setSubmitted(true);

    const formData = new FormData();
    // Send transcript as text instead of audio
    formData.append("answer_text", answerText);
    formData.append("question_index", currentQuestionIndex);

    console.log("Sending to backend:", {
      candidate_id: candidateId,
      question_index: currentQuestionIndex,
      answer_text: answerText.substring(0, 100),
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
        setInterviewState(INTERVIEW_STATE.EVALUATING);
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

  // Move to next question
  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSubmitted(false);
      setEvaluation(null);
      setLiveTranscript("");
      setFinalTranscript("");

      setTimeout(() => {
        setInterviewState(INTERVIEW_STATE.ASKING);
        speakQuestion(questions[nextIndex]);
      }, 500);
    } else {
      setInterviewState(INTERVIEW_STATE.COMPLETE);
      setShowCountdown(false);
    }
  };

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
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-50 p-6">
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
  if (interviewState === INTERVIEW_STATE.COMPLETE) {
    const avgScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : "0";
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
                <span
                  className={score >= 7 ? "text-green-400" : score >= 5 ? "text-yellow-400" : "text-red-400"}
                >
                  {score}/10
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded-xl transition-all"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Get state indicator color
  const getStateColor = () => {
    switch (interviewState) {
      case INTERVIEW_STATE.LISTENING:
        return "text-red-400 bg-red-500/10";
      case INTERVIEW_STATE.PROCESSING:
        return "text-yellow-400 bg-yellow-500/10";
      case INTERVIEW_STATE.EVALUATING:
        return "text-blue-400 bg-blue-500/10";
      case INTERVIEW_STATE.ASKING:
        return "text-cyan-400 bg-cyan-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  // Get state label
  const getStateLabel = () => {
    switch (interviewState) {
      case INTERVIEW_STATE.LISTENING:
        return "🎤 Listening...";
      case INTERVIEW_STATE.PROCESSING:
        return "⏳ Processing answer...";
      case INTERVIEW_STATE.EVALUATING:
        return "📊 Evaluating...";
      case INTERVIEW_STATE.ASKING:
        return "🤖 Speaking question...";
      default:
        return "Idle";
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-cyan-50 flex flex-row">
      {/* Left Side: AI & Question Display */}
      <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
        {/* Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-shrink-0">
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

        {/* State Indicator */}
        <div className={`border rounded-xl p-4 font-bold text-sm flex-shrink-0 ${getStateColor()}`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                interviewState === INTERVIEW_STATE.LISTENING ? "bg-red-500 animate-pulse" : "bg-slate-600"
              }`}
            ></div>
            <span>{getStateLabel()}</span>
          </div>
        </div>

        {/* AI Visualization */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg relative overflow-hidden min-h-0">
          {/* Animated AI Orb */}
          <div className="relative flex items-center justify-center w-40 h-40 mb-6 flex-shrink-0">
            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-3xl animate-pulse opacity-30"></div>
            <div
              className={`w-20 h-20 rounded-full shadow-[0_0_30px_#67e8f9] transition-all ${
                interviewState === INTERVIEW_STATE.LISTENING
                  ? "animate-bounce bg-red-500/50"
                  : "bg-cyan-400"
              }`}
            ></div>
          </div>

          {/* Current Question */}
          <div className="text-center max-h-32 overflow-y-auto px-4 flex-shrink-0">
            <p className="text-sm text-slate-400 mb-2">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            {currentQuestion ? (
              <p className="text-lg font-mono text-cyan-300 leading-relaxed">"{currentQuestion}"</p>
            ) : (
              <p className="text-red-400">Question not loaded</p>
            )}
          </div>

          {/* Live Transcript Display */}
          {(liveTranscript || finalTranscript) && interviewState === INTERVIEW_STATE.LISTENING && (
            <div className="mt-4 px-4 max-h-24 w-full bg-slate-800/50 rounded-lg p-3 overflow-y-auto flex-shrink-0">
              <p className="text-xs text-slate-400 mb-1">Your response:</p>
              <p className="text-sm text-cyan-200 font-mono break-words">
                {finalTranscript}
                <span className="text-yellow-400 animate-pulse">{liveTranscript}</span>
              </p>
            </div>
          )}

          {/* Submission Status */}
          {submitted && evaluation && (
            <div className="mt-6 text-center flex-shrink-0">
              <div
                className={`text-3xl font-bold ${
                  evaluation.score_out_of_10 >= 7
                    ? "text-green-400"
                    : evaluation.score_out_of_10 >= 5
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {evaluation.score_out_of_10}/10
              </div>
              <p className="text-sm text-slate-400 mt-2">{evaluation.accuracy_level}</p>
            </div>
          )}
        </div>

        {/* Feedback Box */}
        {submitted && evaluation && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-shrink-0">
            <h4 className="text-cyan-400 font-bold mb-2">Feedback:</h4>
            <p className="text-xs text-slate-300 mb-2">{evaluation.technical_feedback}</p>
            <p className="text-xs text-slate-400">{evaluation.communication_feedback}</p>
          </div>
        )}
      </div>

      {/* Right Side: Controls & Countdown */}
      <div className="flex-1 bg-slate-900 border-l border-slate-800 flex flex-col gap-4 p-6 relative overflow-hidden">
        {/* Microphone Status Placeholder */}
        <div className="flex-1 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden min-h-0">
          {interviewState === INTERVIEW_STATE.LISTENING && (
            <>
              <div className="absolute inset-0 border-4 border-red-500/50 rounded-2xl animate-pulse"></div>
              <div className="relative z-10 text-center px-4">
                <p className="text-lg text-red-400 font-bold mb-4">🎤 Listening to your response...</p>
                <p className="text-xs text-slate-400">Silence for 2.5 seconds will auto-submit</p>
              </div>
            </>
          )}
          {interviewState !== INTERVIEW_STATE.LISTENING && (
            <p className="text-slate-600 font-mono text-center px-4">
              {interviewState === INTERVIEW_STATE.ASKING
                ? "🤖 Question being spoken..."
                : interviewState === INTERVIEW_STATE.PROCESSING
                ? "⏳ Processing your answer..."
                : interviewState === INTERVIEW_STATE.EVALUATING
                ? "📊 Evaluating response..."
                : "[ LISTENING READY ]"}
            </p>
          )}
        </div>

        {/* Countdown Overlay */}
        {showCountdown && countdownActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-50 rounded-2xl right-6">
            <div className="text-center pointer-events-none">
              <p className="text-sm text-slate-400 mb-4">Next question in</p>
              <div className="text-8xl font-bold text-cyan-400 animate-pulse">{countdownValue}</div>
            </div>
          </div>
        )}

        {/* Score Summary */}
        <div className="bg-slate-800/50 rounded-xl p-4 flex-shrink-0">
          {allScores.length > 0 ? (
            <>
              <h4 className="text-cyan-400 text-sm font-bold mb-3">Scores So Far:</h4>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(allScores.length, 5)}, minmax(0, 1fr))` }}>
                {allScores.map((score, idx) => (
                  <div
                    key={idx}
                    className={`text-center py-2 px-1 rounded-lg text-xs font-bold break-words ${
                      score >= 7
                        ? "bg-green-500/20 text-green-400"
                        : score >= 5
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    Q{idx + 1}
                    <br />
                    {score}/10
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-xs text-center">No scores yet...</p>
          )}
        </div>

        {/* Info Message */}
        <div className="text-center text-xs text-slate-400 px-2 flex-shrink-0">
          <p>Interview flows automatically. Speak naturally and the system will detect when you finish.</p>
        </div>
      </div>
    </main>
  );
}

