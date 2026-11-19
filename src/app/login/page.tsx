"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { apiFetch, saveAuthSession, UserProfile } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [badgeNumber, setBadgeNumber] = useState("2411249");
  const [password, setPassword] = useState("Panda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            badge_number: badgeNumber.trim(),
            password: password.trim(),
          }),
        }
      );
      saveAuthSession(res.token, res.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tidak dapat masuk. Periksa koneksi lalu coba lagi.");
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-context">
        <Link href="/" className="login-back"><ArrowLeft size={17} /> Beranda PANDA</Link>
        <div><img className="login-pusri-logo" src="/assets/logo-pusri-horizontal-dark.png" alt="Pupuk Sriwidjaja Palembang" width="260" height="60" /><h1>PANDA</h1><p>Pusat Administrasi Dokumen Audit TI</p><p className="login-purpose">Pengelolaan dokumen aplikasi dan evidence<br />untuk kebutuhan audit tim TI.</p></div>
        <p className="login-organization">© {new Date().getFullYear()} PT Pupuk Sriwidjaja Palembang</p>
      </section>
      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-content">
          <p className="context-label">PANDA</p>
          <h2 id="login-title">Masuk ke ruang kerja</h2>
          <p className="login-description">Gunakan nomor badge pegawai. Dokumen yang tersedia mengikuti akses tim Anda.</p>
          {error && <div className="login-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
          <form onSubmit={handleLogin}>
            <label htmlFor="badge">Nomor badge pegawai</label>
            <input id="badge" name="username" autoComplete="username" inputMode="numeric" required value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} placeholder="Contoh: 2411249" />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="poc-note" />
            <p id="poc-note" className="login-poc">Lingkungan PoC menggunakan password bersama <code>Panda</code>. Jangan gunakan untuk data sensitif.</p>
            <button className="button-primary" type="submit" disabled={loading}>{loading ? "Memverifikasi badge…" : "Masuk ke ruang kerja"}{!loading && <ArrowRight size={17} />}</button>
          </form>
          <p className="login-help">Belum mendapat akses? Hubungi admin tim untuk pendaftaran badge dan penempatan tim.</p>
        </div>
      </section>
    </main>
  );
}
