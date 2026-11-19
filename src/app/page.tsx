"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, FolderKanban, Home, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getAuthSession } from "@/lib/api";

const VERSIONS = [
  { label: "v1.0", title: "Rilis awal", docs: "PRD · UAT · BAST" },
  { label: "v1.1", title: "Perubahan fitur", docs: "UAT perubahan" },
  { label: "v2.0", title: "Pengembangan besar", docs: "PRD · UAT · BAST" },
];

export default function LandingPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  useEffect(() => { setSignedIn(Boolean(getAuthSession().user)); }, []);
  useEffect(() => {
    let lastY = window.scrollY;
    let idle: number | undefined;
    const reveal = () => {
      setHeaderHidden(false);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setHeaderHidden(window.scrollY > 80 && !document.querySelector(".portal-header:hover, .portal-header:focus-within")), 2500);
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      if (y > lastY && y > 80) setHeaderHidden(true); else reveal();
      lastY = y;
    };
    const onPointer = (event: PointerEvent) => { if (event.clientY < 140) reveal(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);
  const destination = signedIn ? "/dashboard" : "/login";
  const cta = signedIn ? "Buka ruang kerja" : "Masuk";

  return (
    <div className="portal">
      <a className="skip-link" href="#content">Lewati navigasi</a>
      <header className={`portal-header${headerHidden ? " is-hidden" : ""}`} onFocusCapture={() => setHeaderHidden(false)}>
        <Link href="/" className="portal-brand" aria-label="PANDA beranda">
          <img src="/assets/logo-pusri-horizontal-dark.png" alt="Pupuk Sriwidjaja Palembang" width="208" height="48" />
          <span className="portal-product">PANDA</span>
        </Link>
        <nav aria-label="Navigasi utama">
          <a href="#versi">Versi</a>
          <a href="#cari">Pencarian</a>
          <a href="#akses">Akses</a>
          <Link href={destination} className="pill-primary pill-small">{cta}</Link>
        </nav>
      </header>

      <main id="content">
        <section className="hero">
          <span className="stripe-mark" aria-hidden="true" />
          <p className="hero-eyebrow">PANDA</p>
          <h1>Pusat Administrasi<br />Dokumen Audit TI</h1>
          <p className="hero-lede">Setiap dokumen, setiap versi, setiap bukti.<br />Di satu tempat yang dapat ditelusuri.</p>
          <div className="hero-actions">
            <Link href={destination} className="pill-primary">{signedIn ? "Lanjut ke ruang kerja" : "Masuk ke ruang kerja"}</Link>
            <a href="#versi" className="text-link">Lihat cara kerjanya<ChevronRight size={18} /></a>
          </div>

          <figure className="product-shot" aria-label="Tampilan Ringkasan di ruang kerja PANDA">
            <div className="shot-window" aria-hidden="true">
              <aside className="shot-sidebar">
                <span className="shot-dots"><i /><i /><i /></span>
                <p className="shot-group">Ruang kerja</p>
                <span className="shot-folder active"><Home size={15} />Ringkasan</span>
                <p className="shot-group">Temukan dokumen</p>
                <span className="shot-folder"><Sparkles size={15} />Asisten dokumen</span>
                <p className="shot-group">Manajemen konten</p>
                <span className="shot-folder"><FolderKanban size={15} />Dokumen aplikasi</span>
                <span className="shot-folder"><FileText size={15} />Evidence audit</span>
              </aside>
              <div className="shot-main">
                <div>
                  <p className="shot-title">Kesiapan dokumen audit</p>
                  <p className="shot-lede">9 dari 12 versi aplikasi sudah memiliki dokumen wajib.</p>
                </div>
                <p className="shot-group">Perlu dilengkapi</p>
                <div className="shot-rows">
                  {[
                    ["Aplikasi pengadaan · v2.0", "Pengembangan besar", ["BAST"]],
                    ["Portal karyawan · v1.1", "Perubahan modul login", ["UAT"]],
                    ["Sistem gudang · v1.0", "Rilis awal", ["FSD", "BAST"]],
                  ].map(([title, meta, missing]) => (
                    <div key={title as string} className="shot-row">
                      <FolderKanban size={16} />
                      <div><strong>{title}</strong><small>{meta}</small></div>
                      <span className="shot-missing">{(missing as string[]).map((c) => <i key={c}>{c}</i>)}</span>
                      <ChevronRight size={15} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <figcaption>Contoh data. Ringkasan menunjukkan dokumen wajib yang belum ada di tiap versi.</figcaption>
          </figure>
        </section>

        <section id="versi" className="tile tile-dark">
          <span className="stripe-mark" aria-hidden="true" />
          <h2>Setiap versi.<br />Tetap pada tempatnya.</h2>
          <p>Perubahan aplikasi tidak menimpa dokumen rilis awal. Setiap versi punya ruangnya sendiri.</p>
          <ol className="version-track">
            {VERSIONS.map((version) => (
              <li key={version.label}><strong>{version.label}</strong><span>{version.title}</span><small>{version.docs}</small></li>
            ))}
          </ol>
        </section>

        <div className="tile-grid">
          <section id="cari" className="tile tile-light">
            <Search size={34} className="tile-icon" />
            <h2>Cari dengan<br />bahasa sehari-hari.</h2>
            <p>Tanyakan isi dokumen. Jawaban selalu disertai sumbernya, jadi Anda dapat memeriksanya sendiri.</p>
          </section>
          <section id="akses" className="tile tile-light">
            <ShieldCheck size={34} className="tile-icon" />
            <h2>Hanya untuk<br />tim yang berhak.</h2>
            <p>Dokumen yang tampil mengikuti tim dan branch Anda. Setiap unggahan tercatat di log audit.</p>
          </section>
        </div>

        <section className="closing">
          <h2>Siap menyiapkan audit berikutnya?</h2>
          <Link href={destination} className="pill-primary">{signedIn ? "Lanjut ke ruang kerja" : "Masuk ke ruang kerja"}</Link>
        </section>
      </main>

      <footer className="portal-footer">
        <div className="footer-inner">
          <img src="/assets/logo-pusri-horizontal-dark.png" alt="Pupuk Sriwidjaja Palembang" width="132" height="31" />
          <p>Portal internal Teknologi Informasi. Akses dengan nomor badge pegawai.</p>
          <Link href={destination}>{cta}</Link>
        </div>
        <p className="footer-legal">© {new Date().getFullYear()} PT Pupuk Sriwidjaja Palembang · PANDA — Pusat Administrasi Dokumen Audit TI</p>
      </footer>
    </div>
  );
}
