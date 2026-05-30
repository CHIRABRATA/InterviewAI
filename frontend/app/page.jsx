"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MODES = [
  { icon: "💻", name: "Technical",   tag: "DSA · System" },
  { icon: "🧠", name: "Behavioral",  tag: "STAR · Culture" },
  { icon: "📊", name: "Case Study",  tag: "PM · Strategy" },
  { icon: "🔐", name: "Security",    tag: "CTF · Pentest" },
  { icon: "🗄️", name: "Data & ML",  tag: "SQL · Models" },
  { icon: "⭐", name: "Leadership",  tag: "Exec · Vision" },
];

function useCountUp(target, suffix = "", duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = Math.ceil(target / (duration / 30));
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [target, duration]);
  return val.toLocaleString() + suffix;
}

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [text, setText] = useState("");
  const [activeMode, setActiveMode] = useState(0);
  const [launching, setLaunching] = useState(false);
  const fullText = "SYSTEM ONLINE. AWAITING CANDIDATE INITIALIZATION...";

  const candidates = useCountUp(24800, "+", 1200);
  const sessions = useCountUp(3120, "", 900);
  const uptime = useCountUp(99, "%", 600);

  // Typing effect
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i++));
      if (i > fullText.length) clearInterval(timer);
    }, 42);
    return () => clearInterval(timer);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf;

    const resize = () => {
      canvas.width = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,238,${p.a})`;
        ctx.fill();
      });
      particles.forEach((p, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(34,211,238,${0.12 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const handleEnter = () => {
    setLaunching(true);
    setTimeout(() => { setLaunching(false); router.push("/upload"); }, 1800);
  };

  return (
    <main
      ref={wrapRef}
      className="min-h-screen bg-[#020c1b] flex flex-col items-center justify-center p-6 font-mono text-cyan-50 overflow-hidden relative"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: "repeating-linear-gradient(to bottom,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)" }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,12,27,0.92)_100%)] pointer-events-none" />
      {/* Moving scan line */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-[scanMove_4s_linear_infinite] pointer-events-none z-[2]" />

      {/* Corner brackets */}
      {["top-3 left-3 border-t-2 border-l-2","top-3 right-3 border-t-2 border-r-2","bottom-3 left-3 border-b-2 border-l-2","bottom-3 right-3 border-b-2 border-r-2"].map((c,i) => (
        <div key={i} className={`absolute w-4 h-4 border-cyan-500/40 ${c}`} />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-8 text-center w-full max-w-lg">
        {/* Badge */}
        <div className="text-[10px] tracking-[.3em] text-cyan-400/50 border border-cyan-500/20 px-4 py-1 uppercase relative before:content-['◆'] before:absolute before:-left-3 before:text-[6px] before:top-1/2 before:-translate-y-1/2 before:text-cyan-400/40 after:content-['◆'] after:absolute after:-right-3 after:text-[6px] after:top-1/2 after:-translate-y-1/2 after:text-cyan-400/40">
          AI-POWERED INTERVIEW SYSTEM
        </div>

        {/* Title */}
        <div className="relative">
          <h1 className="text-[clamp(2.4rem,9vw,5rem)] font-black tracking-[.18em] leading-none text-white">
            INTERVIEW<span className="text-cyan-400/40">.</span>AI
          </h1>
          <p className="text-[.7rem] tracking-[.15em] text-cyan-400/35 uppercase mt-2">
            Next-gen candidate assessment platform
          </p>
        </div>

        {/* Terminal */}
        <p className="text-[.8rem] text-cyan-300/60 h-6 tracking-wide">
          &gt; {text}<span className="animate-pulse">_</span>
        </p>

        {/* Live metrics */}
        <div className="flex gap-6 items-center">
          {[
            { val: candidates, label: "candidates" },
            { val: sessions, label: "sessions" },
            { val: uptime, label: "uptime" },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-7 bg-cyan-400/15" />}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-bold text-cyan-300">{m.val}</span>
                <span className="text-[9px] tracking-[.2em] text-cyan-400/40 uppercase">{m.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mode selector */}
        <div className="w-full">
          <p className="text-[.6rem] tracking-[.2em] text-cyan-400/30 text-left mb-2 uppercase">
            // select interview mode
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {MODES.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveMode(i)}
                className={`relative p-3 border text-left overflow-hidden transition-all duration-300 group
                  ${activeMode === i
                    ? "border-cyan-400/70 bg-cyan-400/8"
                    : "border-cyan-500/14 bg-cyan-400/4 hover:border-cyan-400/50 hover:-translate-y-0.5"
                  }`}
              >
                <div className="absolute inset-0 bg-cyan-400/6 translate-y-full group-hover:translate-y-0 transition-transform duration-350" />
                <span className="text-lg block mb-1.5">{m.icon}</span>
                <span className="text-[.65rem] tracking-[.12em] text-white/80 uppercase block">{m.name}</span>
                <span className="text-[.55rem] tracking-[.1em] text-cyan-400/40 uppercase mt-0.5 block">{m.tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-3 items-center">
          <button
            onClick={handleEnter}
            style={{ clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)" }}
            className="relative px-12 py-3.5 bg-transparent border border-cyan-400/60 text-cyan-300/90 text-[.75rem] tracking-[.3em] uppercase font-bold overflow-hidden transition-all duration-400 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_30px_rgba(34,211,238,.2)]"
          >
            <div className="absolute inset-0 bg-cyan-400/10 -translate-x-full hover:translate-x-0 transition-transform duration-400" />
            <span className="relative z-10">
              {launching ? "LAUNCHING..." : "INITIALIZE SESSION"}
            </span>
          </button>
          <button
            style={{ clipPath: "polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)" }}
            className="px-6 py-3.5 bg-transparent border border-white/10 text-white/30 text-[.75rem] tracking-[.2em] uppercase transition-all duration-300 hover:border-white/25 hover:text-white/60"
          >
            VIEW DEMO
          </button>
        </div>
      </div>
    </main>
  );
}