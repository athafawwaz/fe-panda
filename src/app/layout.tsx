import type { Metadata } from "next";
import "./globals.css";
import PageTransitionLoader from "@/components/PageTransitionLoader";

export const metadata: Metadata = {
  title: "PANDA — Pusat Administrasi Dokumen Audit | PT Pusri Palembang",
  description:
    "Platform Sentralisasi, Standardisasi, dan Reusability Dokumen & Evidence Audit TI Terintegrasi Agentic AI — PT Pupuk Sriwidjaja Palembang",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        <PageTransitionLoader />
        {children}
      </body>
    </html>
  );
}
