"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const fullText = "SYSTEM ONLINE. AWAITING CANDIDATE INITIALIZATION...";

  // Cool typing effect for the terminal
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-mono text-cyan-50 overflow-hidden relative">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="text-center">
          <h1 className="text-7xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-800 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            INTERVIEW.AI
          </h1>
          <p className="mt-4 text-cyan-400 h-6 text-lg">
            &gt; {text}<span className="animate-pulse">_</span>
          </p>
        </div>

        <button
          onClick={() => router.push('/upload')}
          className="relative group px-12 py-5 bg-transparent border-2 border-cyan-500 rounded-none uppercase tracking-[0.3em] font-bold overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]"
        >
          <div className="absolute inset-0 bg-cyan-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
          <span className="relative z-10 text-cyan-500 group-hover:text-slate-950 transition-colors duration-500">
            ENTER SYSTEM
          </span>
        </button>
      </div>
    </main>
  );
}