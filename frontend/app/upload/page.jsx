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

      // Smooth transition buffer for full neural calibration sequence animation
      setTimeout(() => {
        setDbId(data.db_id);
        setAppState("ready");
      }, 2500);

    } catch (err) {
      setError(err.message);
      setAppState("idle");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans text-cyan-50 relative overflow-hidden selection:bg-cyan-500/30">
      
      {/* Tech Backdrop Grid Layout */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none"></div>

      {/* Futuristic Chassis Container */}
      <div className="w-full max-w-xl bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden min-h-[460px] flex flex-col justify-center border-t-cyan-500/20 border-b-blue-500/10">
        
        {/* Decorative Framing Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-md"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-md"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-md"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40 rounded-br-md"></div>
        
        {/* Top telemetry banner */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-30 font-mono text-[10px] tracking-widest text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          SYS.INIT // CORE_CORE_ACTIVE
        </div>

        {/* STATE 1: IDLE (Upload Resume) */}
        {appState === "idle" && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest font-mono">
                Data Input Required
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">
                Submit document payload to deploy assessment matrix
              </p>
            </div>

            <label className="w-full flex flex-col items-center justify-center h-52 border border-dashed border-slate-800 hover:border-cyan-500/40 bg-slate-950/40 hover:bg-cyan-950/10 rounded-2xl cursor-pointer transition-all duration-300 group shadow-inner relative">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              
              {/* Animated Target Glyph */}
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-cyan-500/30 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all mb-4 relative">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>

              <span className="text-cyan-400 font-mono font-bold tracking-wide group-hover:text-cyan-300 transition-colors">
                Upload Resume (PDF)
              </span>
              <span className="text-[11px] text-slate-500 font-mono tracking-wider mt-1 uppercase">
                Initialize semantic mapping protocol
              </span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf" 
                onChange={(e) => handleUpload(e.target.files[0])} 
              />
            </label>
            
            {error && (
              <div className="bg-red-950/20 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-lg font-mono tracking-wide">
                ⚠️ FAILURE: {error}
              </div>
            )}
          </div>
        )}

        {/* STATE 2: PROCESSING (AI Greeting Sequence) */}
        {appState === "processing" && (
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Glowing Singular Arc Reactor Dynamic Ring */}
            <div className="relative flex items-center justify-center w-36 h-36">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full blur-[35px] opacity-30 animate-pulse"></div>
              <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-[spin_8s_linear_infinite]"></div>
              <div className="absolute inset-2 border border-dashed border-blue-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
              
              {/* Central Core */}
              <div className="w-20 h-20 bg-slate-950 border border-cyan-500/40 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)] relative group">
                <div className="absolute inset-1.5 bg-cyan-400 rounded-full opacity-80 shadow-[0_0_15px_#22d3ee] animate-ping duration-1000"></div>
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full relative z-10 shadow-inner"></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold font-mono tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                &ldquo;HELLO, CANDIDATE.&rdquo;
              </h2>
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest animate-pulse">
                  Scanning target neural pathways...
                </p>
                <div className="w-48 h-0.5 bg-slate-800 rounded-full overflow-hidden mt-1 relative">
                  <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent to-cyan-400 animate-[loading_1.5s_infinite_ease-in-out]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 3: READY (Initialize Loop Button) */}
        {appState === "ready" && (
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Success Telemetry Rings */}
            <div className="w-24 h-24 bg-green-950/20 rounded-full flex items-center justify-center border border-green-500/40 shadow-[0_0_40px_rgba(34,197,94,0.15)] relative">
              <div className="absolute inset-0 border border-green-500/20 rounded-full scale-110 border-dashed animate-[spin_20s_linear_infinite]"></div>
              <svg className="w-10 h-10 text-green-400 filter drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-wide font-mono uppercase">
                Analysis Matrix Ready
              </h2>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
                Semantic layers loaded // Engine sequence initialized
              </p>
            </div>
            
            <button
              onClick={() => router.push(`/interview/${dbId}`)}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all duration-300 active:scale-[0.99] border-t border-cyan-300/20 relative group overflow-hidden"
            >
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/10 opacity-40 group-hover:animate-shine"></div>
              Engage Assessment Arena
            </button>
          </div>
        )}

      </div>
    </main>
  );
}