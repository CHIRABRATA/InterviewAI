"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [appState, setAppState] = useState("idle"); // idle, processing, ready
  const [dbId, setDbId] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setAppState("processing");
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) throw new Error(data.error);

      // Simulate a slight delay so the user can enjoy the AI animation
      setTimeout(() => {
        setDbId(data.db_id);
        setAppState("ready");
      }, 2000);

    } catch (err) {
      setError(err.message);
      setAppState("idle");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans text-cyan-50">
      <div className="w-full max-w-xl bg-slate-900/50 border border-slate-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden text-center min-h-[400px] flex flex-col justify-center">
        
        {/* STATE 1: IDLE (Upload Resume) */}
        {appState === "idle" && (
          <div className="flex flex-col items-center gap-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-widest">Provide Data Payload</h2>
            <label className="w-full flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all duration-300">
              <span className="text-cyan-400 font-bold mb-2">Upload Resume (PDF)</span>
              <span className="text-xs text-slate-500">Initialize parsing protocols</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf" 
                onChange={(e) => handleUpload(e.target.files[0])} 
              />
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* STATE 2: PROCESSING (AI Greeting Animation) */}
        {appState === "processing" && (
          <div className="flex flex-col items-center gap-8 animate-fadeIn">
            {/* Glowing Orb Animation */}
            <div className="relative flex items-center justify-center w-32 h-32">
              <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[40px] animate-pulse opacity-50"></div>
              <div className="w-16 h-16 bg-cyan-300 rounded-full shadow-[0_0_20px_#67e8f9] animate-bounce"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-mono text-cyan-300">"Hello, Candidate."</h2>
              <p className="text-sm text-slate-400 animate-pulse">Scanning neural pathways... analyzing skills...</p>
            </div>
          </div>
        )}

        {/* STATE 3: READY (Start Interview Button) */}
        {appState === "ready" && (
          <div className="flex flex-col items-center gap-8 animate-fadeIn">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Analysis Complete.</h2>
              <p className="text-slate-400 text-sm">Profile parsed. AI is ready for you.</p>
            </div>
            <button
              onClick={() => router.push(`/interview/${dbId}`)}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
            >
              Start Interview
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
