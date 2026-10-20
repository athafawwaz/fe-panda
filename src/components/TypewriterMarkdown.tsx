"use client";

import React, { useEffect, useRef, useState } from "react";

const BASE_CHARS_PER_SECOND = 70; // kecepatan mengetik normal
const CATCH_UP_SECONDS = 1.2; // sisa teks yang panjang dikejar dalam ±waktu ini

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Posisi potong yang aman: tidak memecah pasangan surrogate (emoji). */
function safeCut(text: string, n: number): number {
  if (n > 0 && n < text.length) {
    const code = text.charCodeAt(n - 1);
    if (code >= 0xd800 && code <= 0xdbff) return n + 1;
  }
  return n;
}

/**
 * Menutup penanda markdown yang belum berpasangan di baris terakhir (mis. "**teb") agar teks yang sedang diketik
 * langsung tampil tebal/kode, tidak berkedip dari teks biasa.
 */
function closeOpenMarkers(text: string): string {
  const lastLine = text.slice(text.lastIndexOf("\n") + 1);
  let out = text;
  if ((lastLine.match(/\*\*/g)?.length ?? 0) % 2 === 1) out += "**";
  const ticks = lastLine.replace(/\*\*/g, "").match(/`/g)?.length ?? 0;
  if (ticks % 2 === 1) out += "`";
  return out;
}

interface TypewriterOptions {
  from?: number; // jumlah karakter yang sudah tampil sebelumnya (lanjutan dari jawaban live)
  complete: boolean; // teks sudah final (tidak akan bertambah lagi)
  onProgress?: (shown: number) => void;
  onDone?: () => void;
}

/**
 * Menampilkan `target` huruf demi huruf. Kecepatan menyesuaikan sisa teks: potongan kecil diketik ±70 karakter/detik,
 * sedangkan sisa yang panjang (mis. jawaban builtin yang datang sekaligus) dikejar dalam ±1,2 detik.
 */
export function useTypewriter(target: string, { from = 0, complete, onProgress, onDone }: TypewriterOptions) {
  const [shown, setShown] = useState(() => Math.min(from, target.length));
  const shownRef = useRef(shown);
  const targetRef = useRef(target);
  const completeRef = useRef(complete);
  const callbacks = useRef({ onProgress, onDone });
  const doneCalled = useRef(false);
  targetRef.current = target;
  completeRef.current = complete;
  callbacks.current = { onProgress, onDone };

  useEffect(() => {
    const instant = prefersReducedMotion(); // tanpa animasi: teks langsung tampil penuh
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const text = targetRef.current;
      if (instant && shownRef.current !== text.length) {
        shownRef.current = text.length;
        setShown(text.length);
        callbacks.current.onProgress?.(text.length);
      }
      // Jawaban dibuang & diganti (mis. AI gagal lalu memakai jawaban otomatis): mulai dari panjang yang tersisa
      if (shownRef.current > text.length) {
        shownRef.current = text.length;
        setShown(text.length);
      }
      const backlog = text.length - shownRef.current;
      if (backlog > 0) {
        const cps = Math.max(BASE_CHARS_PER_SECOND, backlog / CATCH_UP_SECONDS);
        carry += (cps * dt) / 1000;
        const step = Math.floor(carry);
        if (step > 0) {
          carry -= step;
          shownRef.current = safeCut(text, Math.min(text.length, shownRef.current + step));
          setShown(shownRef.current);
          callbacks.current.onProgress?.(shownRef.current);
        }
      } else if (completeRef.current && !doneCalled.current) {
        doneCalled.current = true;
        callbacks.current.onDone?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const typing = shown < target.length || !complete;
  return { text: target.slice(0, shown), typing };
}

interface TypewriterMarkdownProps extends TypewriterOptions {
  text: string;
  render: (markdown: string) => React.ReactNode;
}

/** Jawaban AI yang muncul seperti sedang diketik, lengkap dengan kursor berkedip di akhir teks. */
export default function TypewriterMarkdown({ text, render, ...options }: TypewriterMarkdownProps) {
  const { text: shown, typing } = useTypewriter(text, options);
  return <div className={typing ? "ai-typing-caret" : undefined}>{render(typing ? closeOpenMarkers(shown) : shown)}</div>;
}
