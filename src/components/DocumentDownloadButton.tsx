"use client";

import React, { useState } from "react";
import { downloadDocument } from "@/lib/api";

/** Tombol unduh terautentikasi (pengganti <a href>). Galat ditampilkan, tidak ada fallback ke URL publik. */
export default function DocumentDownloadButton({
  docId,
  filename,
  className,
  title,
  children,
}: {
  docId: string;
  filename: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await downloadDocument(docId, filename);
    } catch (err: any) {
      window.alert(err?.message || "Gagal mengunduh dokumen.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      title={title}
      className={`${className ?? ""} ${busy ? "opacity-60 cursor-wait" : ""}`}
    >
      {children}
    </button>
  );
}
