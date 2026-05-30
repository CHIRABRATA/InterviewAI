"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

const INTERVIEW_STATE = {
  IDLE: "idle",
  ASKING: "asking",
  LISTENING: "listening",
  PROCESSING: "processing",
  EVALUATING: "evaluating",
  TRANSITIONING: "transitioning",
  COMPLETE: "complete",
};

const SILENCE_THRESHOLD_MS = 6500;

// ─── Inline global styles injected once ───────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #020509;
    --surface: #060d16;
    --surface2: #0a1624;
    --border: rgba(0, 200, 255, 0.12);
    --border-hot: rgba(0, 200, 255, 0.35);
    --cyan: #00c8ff;
    --cyan-dim: rgba(0,200,255,0.15);
    --red: #ff3b5c;
    --red-dim: rgba(255,59,92,0.15);
    --green: #00ff9d;
    --green-dim: rgba(0,255,157,0.12);
    --amber: #ffaa00;
    --amber-dim: rgba(255,170,0,0.12);
    --purple: #b060ff;
    --purple-dim: rgba(176,96,255,0.12);
    --text: #c8e4f0;
    --text-dim: rgba(200,228,240,0.45);
    --font-display: 'Orbitron', monospace;
    --font-mono: 'Share Tech Mono', monospace;
    --font-body: 'Inter', sans-serif;
    --glow-cyan: 0 0 20px rgba(0,200,255,0.4), 0 0 60px rgba(0,200,255,0.15);
    --glow-red: 0 0 20px rgba(255,59,92,0.4), 0 0 60px rgba(255,59,92,0.15);
    --glow-green: 0 0 20px rgba(0,255,157,0.4), 0 0 60px rgba(0,255,157,0.15);
  }

  html, body { background: var(--bg); color: var(--text); font-family: var(--font-body); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-hot); border-radius: 2px; }

  /* ── Keyframes ── */
  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes flicker {
    0%,100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.7; }
    94% { opacity: 1; }
    97% { opacity: 0.85; }
    98% { opacity: 1; }
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes data-stream {
    0% { background-position: 0 0; }
    100% { background-position: 0 200px; }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes spin-slow-rev {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes blink-cursor {
    0%,100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes count-pop {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes waveform {
    0%,100% { height: 4px; }
    50% { height: 24px; }
  }
  @keyframes corner-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes glitch-1 {
    0%,100% { clip-path: inset(0 0 90% 0); transform: translate(-3px,0); }
    25% { clip-path: inset(40% 0 40% 0); transform: translate(3px,0); }
    50% { clip-path: inset(80% 0 5% 0); transform: translate(-2px,0); }
    75% { clip-path: inset(20% 0 60% 0); transform: translate(2px,0); }
  }
  @keyframes glitch-2 {
    0%,100% { clip-path: inset(50% 0 30% 0); transform: translate(3px,0); }
    33% { clip-path: inset(10% 0 75% 0); transform: translate(-3px,0); }
    66% { clip-path: inset(65% 0 10% 0); transform: translate(2px,0); }
  }
  @keyframes dash-travel {
    to { stroke-dashoffset: -100; }
  }
  @keyframes meter-fill {
    from { width: 0%; }
    to { width: var(--target-w); }
  }
  @keyframes loading-bar {
    0% { transform: scaleX(0); transform-origin: left; }
    50% { transform: scaleX(1); transform-origin: left; }
    51% { transform: scaleX(1); transform-origin: right; }
    100% { transform: scaleX(0); transform-origin: right; }
  }

  /* ── Utility ── */
  .arena-root {
    min-height: 100vh;
    background: var(--bg);
    position: relative;
    overflow: hidden;
    font-family: var(--font-body);
    animation: flicker 8s infinite;
  }

  /* CRT scanline overlay */
  .arena-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.08) 2px,
      rgba(0,0,0,0.08) 4px
    );
    pointer-events: none;
    z-index: 100;
  }

  /* Moving scan line */
  .scanline {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,200,255,0.15), transparent);
    animation: scan 6s linear infinite;
    pointer-events: none;
    z-index: 99;
  }

  /* Grid background */
  .grid-bg {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Layout ── */
  .arena-layout {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr 1fr;
    gap: 12px;
    padding: 16px;
    min-height: 100vh;
    max-height: 100vh;
    overflow: hidden;
  }

  /* ── Header ── */
  .arena-header {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    position: relative;
    overflow: hidden;
  }
  .arena-header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cyan), transparent);
  }

  .header-logo {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 900;
    color: var(--cyan);
    letter-spacing: 0.2em;
    text-shadow: var(--glow-cyan);
  }

  .header-state {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .state-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
  }
  .state-dot.listening::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid var(--red);
    animation: pulse-ring 1.2s ease-out infinite;
  }

  .header-progress {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .progress-pip {
    width: 20px; height: 3px;
    border-radius: 2px;
    background: var(--surface2);
    border: 1px solid var(--border);
    transition: background 0.4s, box-shadow 0.4s;
  }
  .progress-pip.done {
    background: var(--cyan);
    box-shadow: 0 0 6px var(--cyan);
  }
  .progress-pip.active {
    background: var(--cyan);
    box-shadow: 0 0 12px var(--cyan);
    animation: loading-bar 1.5s ease-in-out infinite;
  }

  /* ── Panel base ── */
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-hot), transparent);
  }

  /* Corner decorations */
  .panel-corner {
    position: absolute;
    width: 12px; height: 12px;
    z-index: 2;
  }
  .panel-corner::before, .panel-corner::after {
    content: '';
    position: absolute;
    background: var(--cyan);
  }
  .panel-corner::before { width: 100%; height: 1px; top: 0; left: 0; }
  .panel-corner::after  { width: 1px; height: 100%; top: 0; left: 0; }
  .panel-corner.tl { top: 6px; left: 6px; }
  .panel-corner.tr { top: 6px; right: 6px; transform: scaleX(-1); }
  .panel-corner.bl { bottom: 6px; left: 6px; transform: scaleY(-1); }
  .panel-corner.br { bottom: 6px; right: 6px; transform: scale(-1,-1); }

  .panel-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 10px 16px 8px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .rec-badge {
    display: flex; align-items: center; gap: 5px;
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .rec-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--red);
    animation: blink-cursor 1s step-end infinite;
    box-shadow: 0 0 6px var(--red);
  }

  /* ── AI Panel (left top) ── */
  .panel-ai {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 20px;
    min-height: 0;
  }

  /* Orb */
  .orb-wrap {
    position: relative;
    width: 120px; height: 120px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .orb-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid;
  }
  .orb-ring-1 {
    inset: 0;
    border-color: rgba(0,200,255,0.25);
    animation: spin-slow 8s linear infinite;
  }
  .orb-ring-1::before {
    content: '';
    position: absolute;
    top: -2px; left: 50%;
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: var(--glow-cyan);
    transform: translateX(-50%);
  }
  .orb-ring-2 {
    inset: 12px;
    border-color: rgba(0,200,255,0.15);
    animation: spin-slow-rev 12s linear infinite;
  }
  .orb-ring-2::before {
    content: '';
    position: absolute;
    bottom: -2px; left: 50%;
    width: 3px; height: 3px;
    border-radius: 50%;
    background: var(--purple);
    box-shadow: 0 0 8px var(--purple);
    transform: translateX(-50%);
  }
  .orb-core {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(0,200,255,0.9), rgba(0,80,160,0.6));
    box-shadow: var(--glow-cyan);
    transition: all 0.3s ease;
    z-index: 1;
    flex-shrink: 0;
  }
  .orb-core.listening {
    background: radial-gradient(circle at 35% 35%, rgba(255,59,92,0.9), rgba(160,0,40,0.6));
    box-shadow: var(--glow-red);
    transform: scale(1.1);
  }
  .orb-pulse {
    position: absolute;
    inset: 20px;
    border-radius: 50%;
    border: 1px solid var(--cyan);
    opacity: 0;
  }
  .orb-pulse.active {
    animation: pulse-ring 1.5s ease-out infinite;
  }

  /* Question text */
  .question-area {
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
  }
  .q-counter {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.2em;
    margin-bottom: 10px;
  }
  .q-text {
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 400;
    color: #e8f4ff;
    line-height: 1.65;
    letter-spacing: 0.01em;
    animation: fadeSlideIn 0.4s ease;
  }
  .q-cursor {
    display: inline-block;
    width: 2px; height: 1em;
    background: var(--cyan);
    margin-left: 3px;
    vertical-align: middle;
    animation: blink-cursor 0.8s step-end infinite;
  }

  /* ── Transcript Panel (right top) ── */
  .transcript-body {
    flex: 1;
    padding: 14px 16px;
    overflow-y: auto;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.7;
    color: var(--text);
    min-height: 0;
  }
  .transcript-final { color: #c8e4f0; }
  .transcript-live  { color: var(--cyan); background: rgba(0,200,255,0.06); border-radius: 2px; }

  .waveform {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 10px 16px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .wave-bar {
    width: 3px;
    background: var(--red);
    border-radius: 2px;
    height: 4px;
    box-shadow: 0 0 4px var(--red);
  }
  .wave-bar:nth-child(1)  { animation: waveform 0.6s ease-in-out 0.0s infinite; }
  .wave-bar:nth-child(2)  { animation: waveform 0.6s ease-in-out 0.05s infinite; }
  .wave-bar:nth-child(3)  { animation: waveform 0.6s ease-in-out 0.10s infinite; }
  .wave-bar:nth-child(4)  { animation: waveform 0.6s ease-in-out 0.15s infinite; }
  .wave-bar:nth-child(5)  { animation: waveform 0.6s ease-in-out 0.20s infinite; }
  .wave-bar:nth-child(6)  { animation: waveform 0.6s ease-in-out 0.25s infinite; }
  .wave-bar:nth-child(7)  { animation: waveform 0.6s ease-in-out 0.20s infinite; }
  .wave-bar:nth-child(8)  { animation: waveform 0.6s ease-in-out 0.15s infinite; }
  .wave-bar:nth-child(9)  { animation: waveform 0.6s ease-in-out 0.10s infinite; }
  .wave-bar:nth-child(10) { animation: waveform 0.6s ease-in-out 0.05s infinite; }
  .wave-bar:nth-child(11) { animation: waveform 0.6s ease-in-out 0.0s infinite; }

  .done-btn {
    margin: 10px 16px 14px;
    padding: 10px 0;
    background: transparent;
    border: 1px solid var(--red);
    color: var(--red);
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.15em;
    cursor: pointer;
    text-transform: uppercase;
    transition: background 0.2s, box-shadow 0.2s;
    flex-shrink: 0;
  }
  .done-btn:hover {
    background: var(--red-dim);
    box-shadow: var(--glow-red);
  }

  /* ── Eval Panel (left bottom) ── */
  .eval-body {
    flex: 1;
    padding: 14px 16px;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .eval-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--border-hot);
    letter-spacing: 0.1em;
  }

  .eval-score-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
    animation: fadeSlideIn 0.3s ease;
  }
  .eval-accuracy {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text);
  }
  .eval-score {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 900;
    line-height: 1;
  }
  .eval-score .denom {
    font-size: 18px;
    opacity: 0.45;
    font-weight: 400;
  }
  .eval-score.good  { color: var(--green);  text-shadow: var(--glow-green); }
  .eval-score.meh   { color: var(--amber);  text-shadow: 0 0 20px rgba(255,170,0,0.4); }
  .eval-score.bad   { color: var(--red);    text-shadow: var(--glow-red); }

  .eval-section {
    animation: fadeSlideIn 0.4s ease 0.1s both;
  }
  .eval-section-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .eval-section-label.tech { color: var(--cyan); }
  .eval-section-label.comm { color: var(--purple); }
  .eval-section-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.6;
  }

  /* ── History Panel (right bottom) ── */
  .history-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
  }
  .history-item {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 10px 12px;
    background: var(--surface2);
    animation: fadeSlideIn 0.35s ease;
    flex-shrink: 0;
  }
  .history-item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .history-q {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    flex: 1;
    margin-right: 10px;
    line-height: 1.45;
  }
  .history-score {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .history-score.good  { color: var(--green); }
  .history-score.meh   { color: var(--amber); }
  .history-score.bad   { color: var(--red); }
  .history-bar-wrap {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  .history-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s ease;
  }
  .history-bar.good  { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .history-bar.meh   { background: var(--amber); box-shadow: 0 0 6px var(--amber); }
  .history-bar.bad   { background: var(--red);   box-shadow: 0 0 6px var(--red); }

  /* ── Transition Overlay ── */
  .transition-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2,5,9,0.92);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    backdrop-filter: blur(4px);
  }
  .transition-label {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-dim);
    letter-spacing: 0.25em;
    text-transform: uppercase;
  }
  .transition-count {
    font-family: var(--font-display);
    font-size: 96px;
    font-weight: 900;
    color: var(--cyan);
    text-shadow: var(--glow-cyan);
    animation: count-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    line-height: 1;
  }
  .transition-bar {
    width: 160px; height: 2px;
    background: var(--border);
    border-radius: 1px;
    overflow: hidden;
  }
  .transition-fill {
    height: 100%;
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan);
    transition: width 1s linear;
  }

  /* ── Loading Screen ── */
  .loading-screen {
    min-height: 100vh;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    font-family: var(--font-display);
  }
  .loading-hex {
    width: 64px; height: 64px;
    border: 2px solid rgba(0,200,255,0.3);
    border-top-color: var(--cyan);
    border-radius: 50%;
    animation: spin-slow 1s linear infinite;
    box-shadow: var(--glow-cyan);
  }
  .loading-text {
    font-size: 13px;
    color: var(--cyan);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    animation: blink-cursor 1.2s step-end infinite;
  }

  /* ── Complete Screen ── */
  .complete-screen {
    min-height: 100vh;
    background: var(--bg);
    position: relative;
    overflow: hidden;
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--font-body);
  }
  .complete-inner {
    width: 100%;
    max-width: 860px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: relative;
    z-index: 1;
  }

  .complete-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--cyan);
    text-shadow: var(--glow-cyan);
    text-align: center;
    text-transform: uppercase;
  }
  .complete-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.3em;
    text-align: center;
    text-transform: uppercase;
    margin-top: -16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
    animation: fadeSlideIn 0.4s ease;
  }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-hot), transparent);
  }
  .stat-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .stat-value {
    font-family: var(--font-display);
    font-size: 52px;
    font-weight: 900;
    line-height: 1;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 420px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .result-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 20px;
    animation: fadeSlideIn 0.4s ease;
    transition: border-color 0.2s;
  }
  .result-card:hover { border-color: var(--border-hot); }
  .result-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .result-q {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    flex: 1;
    margin-right: 16px;
    line-height: 1.5;
  }
  .result-q span {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    margin-right: 8px;
  }
  .result-score {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .result-transcript {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
    margin-bottom: 12px;
    line-height: 1.6;
  }
  .result-feedback-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .result-fb { }
  .result-fb-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .result-fb-label.tech { color: var(--cyan); }
  .result-fb-label.comm { color: var(--purple); }
  .result-fb-text {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.55;
  }

  .exit-btn {
    width: 100%;
    padding: 16px;
    background: transparent;
    border: 1px solid var(--cyan);
    border-radius: 6px;
    color: var(--cyan);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .exit-btn:hover {
    background: var(--cyan-dim);
    box-shadow: var(--glow-cyan);
  }

  /* Processing spinner */
  .processing-ring {
    width: 32px; height: 32px;
    border: 2px solid rgba(255,170,0,0.2);
    border-top-color: var(--amber);
    border-radius: 50%;
    animation: spin-slow 0.8s linear infinite;
    box-shadow: 0 0 10px rgba(255,170,0,0.3);
  }

  /* Glitch title effect */
  .glitch-wrap { position: relative; }
  .glitch-wrap::before,
  .glitch-wrap::after {
    content: attr(data-text);
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    color: var(--cyan);
  }
  .glitch-wrap::before {
    color: var(--red);
    animation: glitch-1 4s step-end infinite;
    animation-delay: 2s;
  }
  .glitch-wrap::after {
    color: var(--purple);
    animation: glitch-2 4s step-end infinite;
    animation-delay: 2.5s;
  }
`;

export default function InterviewArena() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interviewState, setInterviewState] = useState(INTERVIEW_STATE.IDLE);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [countdownValue, setCountdownValue] = useState(3);
  const [transitionPct, setTransitionPct] = useState(100);

  const stateRef = useRef(INTERVIEW_STATE.IDLE);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const lastSpeechTimeRef = useRef(Date.now());
  const submittingRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const finalTranscriptRef = useRef("");
  const currentIndexRef = useRef(0);
  const questionsRef = useRef([]);

  // Inject CSS once
  useEffect(() => {
    const id = "interview-arena-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }
    return () => { /* keep styles */ };
  }, []);

  useEffect(() => {
    stateRef.current = interviewState;
    currentIndexRef.current = currentIndex;
    questionsRef.current = questions;
  }, [interviewState, currentIndex, questions]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch(`http://localhost:8000/generate-questions/${candidateId}`);
        const data = await response.json();
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          questionsRef.current = data.questions;
          setTimeout(() => askQuestion(data.questions[0]), 1000);
        }
      } catch (error) {
        console.error("Failed to load questions:", error);
      }
    };
    loadQuestions();
  }, [candidateId]);

  const askQuestion = (text) => {
    setInterviewState(INTERVIEW_STATE.ASKING);
    setLiveTranscript(""); setFinalTranscript("");
    liveTranscriptRef.current = ""; finalTranscriptRef.current = "";
    setEvaluation(null); submittingRef.current = false;

    if (!("speechSynthesis" in window)) { startListening(); return; }

    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; utterance.pitch = 1;
      utterance.onend = () => { isSpeakingRef.current = false; startListening(); };
      utterance.onerror = () => { isSpeakingRef.current = false; startListening(); };
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const startListening = useCallback(() => {
    if (stateRef.current === INTERVIEW_STATE.COMPLETE) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Please use Chrome for Speech Recognition."); return; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (e) {} }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";

    recognition.onstart = () => {
      setInterviewState(INTERVIEW_STATE.LISTENING);
      lastSpeechTimeRef.current = Date.now();
    };

    recognition.onresult = (event) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) { final += text + " "; }
        else { interim += text; }
      }
      setLiveTranscript(interim); liveTranscriptRef.current = interim;
      if (final) { setFinalTranscript(p => p + final); finalTranscriptRef.current += final; }
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

  useEffect(() => {
    const timer = setInterval(() => {
      if (stateRef.current === INTERVIEW_STATE.LISTENING && !submittingRef.current) {
        if (Date.now() - lastSpeechTimeRef.current > SILENCE_THRESHOLD_MS) { submitAnswer(); }
      }
    }, 300);
    return () => clearInterval(timer);
  }, []);

  const submitAnswer = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setInterviewState(INTERVIEW_STATE.PROCESSING);
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }

    const answerText = (finalTranscriptRef.current + " " + liveTranscriptRef.current).trim();
    const currentIdx = currentIndexRef.current;
    const currentQuestion = questionsRef.current[currentIdx];
    const formData = new FormData();
    formData.append("answer_text", answerText);
    formData.append("question_index", currentIdx);

    try {
      const response = await fetch(`http://localhost:8000/process-answer/${candidateId}`, { method: "POST", body: formData });
      const data = await response.json();
      if (data.evaluation) {
        setEvaluation(data.evaluation);
        setInterviewState(INTERVIEW_STATE.EVALUATING);
        setInterviewHistory(prev => [...prev, { question: currentQuestion, transcript: data.transcript, analytics: data.analytics, evaluation: data.evaluation }]);
        setTimeout(() => triggerTransition(), 4000);
      } else { triggerTransition(); }
    } catch (error) {
      console.error("Backend Error:", error);
      triggerTransition();
    }
  };

  const triggerTransition = () => {
    const currentIdx = currentIndexRef.current;
    const total = questionsRef.current.length;
    if (currentIdx >= total - 1) { setInterviewState(INTERVIEW_STATE.COMPLETE); return; }

    setInterviewState(INTERVIEW_STATE.TRANSITIONING);
    let count = 3; setCountdownValue(count); setTransitionPct(100);

    const interval = setInterval(() => {
      count -= 1; setCountdownValue(count); setTransitionPct(Math.round((count / 3) * 100));
      if (count <= 0) {
        clearInterval(interval);
        const nextIdx = currentIdx + 1;
        setCurrentIndex(nextIdx); currentIndexRef.current = nextIdx;
        askQuestion(questionsRef.current[nextIdx]);
      }
    }, 1000);
  };

  const scoreClass = (s) => s >= 7 ? "good" : s >= 5 ? "meh" : "bad";
  const scoreColor = (s) => s >= 7 ? "var(--green)" : s >= 5 ? "var(--amber)" : "var(--red)";

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <main className="loading-screen">
        <div className="grid-bg" />
        <div className="scanline" />
        <div className="loading-hex" />
        <p className="loading-text">Initializing Neural Assessment</p>
      </main>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (interviewState === INTERVIEW_STATE.COMPLETE) {
    const total = interviewHistory.reduce((s, i) => s + i.evaluation.score_out_of_10, 0);
    const avg = interviewHistory.length ? (total / interviewHistory.length).toFixed(1) : 0;
    const fillers = interviewHistory.reduce((s, i) => s + (i.analytics?.filler_words_detected || 0), 0);

    return (
      <main className="complete-screen arena-root">
        <div className="grid-bg" />
        <div className="scanline" />
        <div className="complete-inner">
          <div>
            <div
              className="complete-title glitch-wrap"
              data-text="Assessment Complete"
            >
              Assessment Complete
            </div>
            <div className="complete-sub">Llama 3 · Final Debrief · {interviewHistory.length} Questions</div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Overall Score</div>
              <div className={`stat-value ${scoreClass(parseFloat(avg))}`}
                style={{ color: scoreColor(parseFloat(avg)), textShadow: `0 0 20px ${scoreColor(parseFloat(avg))}40` }}>
                {avg}<span style={{ fontSize: 22, opacity: 0.4, fontWeight: 400 }}>/10</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Filler Words</div>
              <div className="stat-value" style={{ color: "var(--amber)", textShadow: "0 0 20px rgba(255,170,0,0.4)" }}>{fillers}</div>
            </div>
          </div>

          <div className="history-list">
            {interviewHistory.map((item, idx) => (
              <div key={idx} className="result-card">
                <div className="result-card-header">
                  <p className="result-q"><span>Q{idx + 1}:</span>{item.question}</p>
                  <span className={`result-score ${scoreClass(item.evaluation.score_out_of_10)}`}
                    style={{ color: scoreColor(item.evaluation.score_out_of_10) }}>
                    {item.evaluation.score_out_of_10}/10
                  </span>
                </div>
                <div className="result-transcript">"{item.transcript || "[Silence Detected]"}"</div>
                <div className="result-feedback-grid">
                  <div className="result-fb">
                    <div className="result-fb-label tech">Technical</div>
                    <p className="result-fb-text">{item.evaluation.technical_feedback}</p>
                  </div>
                  <div className="result-fb">
                    <div className="result-fb-label comm">Communication</div>
                    <p className="result-fb-text">{item.evaluation.communication_feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="exit-btn" onClick={() => router.push('/')}>
            Return to Terminal
          </button>
        </div>
      </main>
    );
  }

  // ── Main Arena ───────────────────────────────────────────────────────────────
  const isListening = interviewState === INTERVIEW_STATE.LISTENING;
  const isProcessing = interviewState === INTERVIEW_STATE.PROCESSING;
  const isEvaluating = interviewState === INTERVIEW_STATE.EVALUATING;
  const isTransitioning = interviewState === INTERVIEW_STATE.TRANSITIONING;

  const stateLabel = {
    [INTERVIEW_STATE.ASKING]: "AI Speaking",
    [INTERVIEW_STATE.LISTENING]: "Recording",
    [INTERVIEW_STATE.PROCESSING]: "Processing",
    [INTERVIEW_STATE.EVALUATING]: "Evaluating",
    [INTERVIEW_STATE.TRANSITIONING]: "Transitioning",
  }[interviewState] ?? interviewState;

  const stateDotColor = {
    [INTERVIEW_STATE.ASKING]: "var(--cyan)",
    [INTERVIEW_STATE.LISTENING]: "var(--red)",
    [INTERVIEW_STATE.PROCESSING]: "var(--amber)",
    [INTERVIEW_STATE.EVALUATING]: "var(--green)",
    [INTERVIEW_STATE.TRANSITIONING]: "var(--text-dim)",
  }[interviewState] ?? "var(--text-dim)";

  return (
    <main className="arena-root">
      <div className="grid-bg" />
      <div className="scanline" />

      {/* Transition overlay */}
      {isTransitioning && (
        <div className="transition-overlay">
          <div className="transition-label">Next Question In</div>
          <div key={countdownValue} className="transition-count">{countdownValue}</div>
          <div className="transition-bar">
            <div className="transition-fill" style={{ width: `${transitionPct}%` }} />
          </div>
        </div>
      )}

      <div className="arena-layout">

        {/* ── Header ── */}
        <div className="arena-header">
          <div className="header-logo">NEURAL / ARENA</div>

          <div className="header-state">
            <div
              className={`state-dot${isListening ? " listening" : ""}`}
              style={{ background: stateDotColor, boxShadow: `0 0 8px ${stateDotColor}` }}
            />
            {isProcessing && <div className="processing-ring" style={{ width: 16, height: 16 }} />}
            <span style={{ color: stateDotColor, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em" }}>
              {stateLabel.toUpperCase()}
            </span>
          </div>

          <div className="header-progress">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`progress-pip ${i < currentIndex ? "done" : i === currentIndex ? "active" : ""}`}
              />
            ))}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", marginLeft: 6 }}>
              {currentIndex + 1}/{questions.length}
            </span>
          </div>
        </div>

        {/* ── AI Panel (top-left) ── */}
        <div className="panel">
          <div className="panel-corner tl" /><div className="panel-corner tr" />
          <div className="panel-corner bl" /><div className="panel-corner br" />
          <div className="panel-label">
            <span>AI Interviewer</span>
            {interviewState === INTERVIEW_STATE.ASKING && (
              <span style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em" }}>
                SPEAKING
              </span>
            )}
          </div>
          <div className="panel-ai">
            <div className="orb-wrap">
              <div className="orb-ring orb-ring-1" />
              <div className="orb-ring orb-ring-2" />
              <div className={`orb-pulse${isListening ? " active" : ""}`} style={{ borderColor: isListening ? "var(--red)" : "var(--cyan)" }} />
              <div className={`orb-core${isListening ? " listening" : ""}`} />
            </div>
            <div className="question-area">
              <div className="q-counter">
                Question {currentIndex + 1} of {questions.length}
              </div>
              <p className="q-text">
                {questions[currentIndex]}
                {interviewState === INTERVIEW_STATE.ASKING && <span className="q-cursor" />}
              </p>
            </div>
          </div>
        </div>

        {/* ── Transcript Panel (top-right) ── */}
        <div className="panel">
          <div className="panel-corner tl" /><div className="panel-corner tr" />
          <div className="panel-corner bl" /><div className="panel-corner br" />
          <div className="panel-label">
            <span>Live Transcript</span>
            {isListening && (
              <div className="rec-badge">
                <div className="rec-dot" />
                <span>REC</span>
              </div>
            )}
          </div>
          <div className="transcript-body">
            <span className="transcript-final">{finalTranscript}</span>
            <span className="transcript-live">{liveTranscript}</span>
            {!finalTranscript && !liveTranscript && (
              <span style={{ color: "var(--border-hot)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {isListening ? "Listening..." : "[ Awaiting Speech ]"}
              </span>
            )}
          </div>
          {isListening && (
            <div className="waveform">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="wave-bar" />
              ))}
            </div>
          )}
          {isListening && (
            <button className="done-btn" onClick={submitAnswer}>
              Done Speaking
            </button>
          )}
        </div>

        {/* ── Evaluation Panel (bottom-left) ── */}
        <div className="panel">
          <div className="panel-corner tl" /><div className="panel-corner tr" />
          <div className="panel-corner bl" /><div className="panel-corner br" />
          <div className="panel-label">
            <span>AI Evaluation</span>
            {isProcessing && <div className="processing-ring" />}
          </div>
          <div className="eval-body">
            {isEvaluating && evaluation ? (
              <>
                <div className="eval-score-row">
                  <span className="eval-accuracy">{evaluation.accuracy_level}</span>
                  <span className={`eval-score ${scoreClass(evaluation.score_out_of_10)}`}>
                    {evaluation.score_out_of_10}<span className="denom">/10</span>
                  </span>
                </div>
                <div className="eval-section">
                  <div className="eval-section-label tech">Technical Feedback</div>
                  <p className="eval-section-text">{evaluation.technical_feedback}</p>
                </div>
                <div className="eval-section">
                  <div className="eval-section-label comm">Communication</div>
                  <p className="eval-section-text">{evaluation.communication_feedback}</p>
                </div>
              </>
            ) : (
              <div className="eval-empty">
                {isProcessing ? "ANALYZING RESPONSE..." : "[ AWAITING INPUT ]"}
              </div>
            )}
          </div>
        </div>

        {/* ── History Panel (bottom-right) ── */}
        <div className="panel">
          <div className="panel-corner tl" /><div className="panel-corner tr" />
          <div className="panel-corner bl" /><div className="panel-corner br" />
          <div className="panel-label">
            <span>Session Log</span>
            <span>{interviewHistory.length} answer{interviewHistory.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="history-body">
            {interviewHistory.length === 0 && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--border-hot)", margin: "auto" }}>
                [ No answers yet ]
              </div>
            )}
            {interviewHistory.map((item, idx) => {
              const sc = item.evaluation.score_out_of_10;
              const cls = scoreClass(sc);
              return (
                <div key={idx} className="history-item">
                  <div className="history-item-header">
                    <p className="history-q">
                      <span style={{ color: "var(--cyan)", marginRight: 6 }}>Q{idx + 1}</span>
                      {item.question}
                    </p>
                    <span className={`history-score ${cls}`}>{sc}/10</span>
                  </div>
                  <div className="history-bar-wrap">
                    <div
                      className={`history-bar ${cls}`}
                      style={{ width: `${(sc / 10) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}