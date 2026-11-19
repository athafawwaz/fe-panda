"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { fetchDocumentBlob } from "@/lib/api";

/** Pratinjau dokumen via fetch terautentikasi -> object URL. URL dibersihkan saat ganti dokumen/unmount. */
export default function DocumentPreviewFrame({ docId, title }: { docId: string; title: string }) {
  const [state, setState] = useState<{ url?: string; error?: string }>({});

  useEffect(() => {
    setState({});
    const ctrl = new AbortController();
    let objectUrl: string | undefined;
    fetchDocumentBlob(docId, "preview", ctrl.signal)
      .then((blob) => {
        if (ctrl.signal.aborted) return; // hasil basi dari dokumen sebelumnya
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl });
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) setState({ error: err?.message || "Gagal memuat dokumen." });
      });
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  if (state.error) {
    return (
      <div className="w-full h-full flex items-center justify-center gap-2 text-xs font-bold text-rose-700">
        <AlertCircle size={16} /> {state.error}
      </div>
    );
  }
  if (!state.url) {
    return (
      <div className="w-full h-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Memuat dokumen...
      </div>
    );
  }
  return <iframe src={state.url} className="w-full h-full border-0" title={title} />;
}
