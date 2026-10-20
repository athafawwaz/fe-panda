"use client";

import React, { useState } from "react";
import { Check, Copy, Forward, Reply, ArrowUp } from "lucide-react";

/** Menyalin teks ke clipboard; fallback textarea untuk browser/konteks tanpa Clipboard API (mis. http non-localhost). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }
}

interface MessageActionsProps {
  text: string;
  onReply?: () => void;
  onForward?: () => void;
  onUse?: () => void;
  align?: "left" | "right";
}

/** Aksi per pesan chat: Salin, Balas (konteks pesan ikut dikirim ke AI), Teruskan (ke percakapan baru), dan Gunakan kembali. */
export default function MessageActions({ text, onReply, onForward, onUse, align = "left" }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const btn =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50/90 transition-colors bg-white/70 border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
      <button
        type="button"
        className={btn}
        title="Salin pesan"
        onClick={async () => {
          if (await copyText(text)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }
        }}
      >
        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        {copied ? "Tersalin" : "Salin"}
      </button>
      {onReply && (
        <button type="button" className={btn} title="Balas pesan ini — AI membaca pesan ini sebagai konteks" onClick={onReply}>
          <Reply size={13} /> Balas
        </button>
      )}
      {onUse && (
        <button
          type="button"
          className={btn}
          title="Isi prompt ini ke kotak chat (bisa juga tekan tombol Panah Atas di keyboard)"
          onClick={onUse}
        >
          <ArrowUp size={13} /> Gunakan
        </button>
      )}
      {onForward && (
        <button type="button" className={btn} title="Teruskan pesan ini ke percakapan baru" onClick={onForward}>
          <Forward size={13} /> Teruskan
        </button>
      )}
    </div>
  );
}
