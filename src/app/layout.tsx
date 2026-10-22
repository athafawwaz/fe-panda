import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-corporate",
  display: "swap",
});

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
    <html lang="id" className={plex.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
