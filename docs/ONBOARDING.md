# Panduan Onboarding Tim — HoneyMind

Selamat datang di tim HoneyMind. Dokumen ini membantu anggota baru produktif dengan cepat. Untuk desain lengkap baca [ARSITEKTUR.md](ARSITEKTUR.md); untuk menjalankan sistem baca [RUNBOOK.md](RUNBOOK.md).

## 1. Penyiapan Lingkungan

1. Pasang **Docker Desktop**, **Node.js 18+**, dan **Python 3.10+**.
2. Klon repositori, lalu ikuti langkah di [RUNBOOK.md](RUNBOOK.md) untuk menyalakan seluruh stack.
3. Catatan mesin lokal: bila port 5432 sudah terpakai PostgreSQL lain, gunakan `DATABASE_URL` ke port alternatif (lihat tabel pemecahan masalah di RUNBOOK).

## 2. Peta Sistem (5 menit)

HoneyMind = tiga layanan ter-dekopel via Redis. Penyerang masuk lewat **Hub** (SSH palsu) → setiap perintah mengalir ke **AI Layer** (menyimpan, menskor, *hunt* ML, memutuskan respons) → hasil tampil di **Dashboard**. Detail & diagram ada di [ARSITEKTUR.md](ARSITEKTUR.md).

Konsep kunci yang harus dipahami sejak awal: **loop otonom** (*persist → skor → hunt → tier → respons*) dan **kontrak kanal Redis**.

## 3. Tugas Umum

| Tujuan | Mulai dari |
|---|---|
| Menjalankan & mendemokan sistem | [RUNBOOK.md](RUNBOOK.md) |
| Mengubah perintah statis vs. AI | `hub/hybridRouter.js` |
| Mengubah persona/tipuan terminal | `ai/llm_engine.py` |
| Mengubah bobot bahaya perintah | `ai/threat_scorer.py` (`THREAT_WEIGHTS`) |
| Menambah/mengubah fitur ML | `ai/features.py` + `ai/detection.py`, lalu latih ulang via `tools/train_model.py` |
| Mengubah ambang/timing respons | `ai/response_engine.py` |
| Mengubah isi IOC | `ai/ioc_export.py` |
| Mengubah tampilan dashboard | `dashboard/src/` |
| Menambah pesan antarlayanan | Tambah kanal Redis (penerbit + pelanggan) — daftarkan di tabel kanal [ARSITEKTUR.md](ARSITEKTUR.md) |

Sebelum mengirim perubahan: jalankan `cd ai && pytest` (logika murni di-*unit test*); untuk I/O (Redis/DB/SSH/React) verifikasi lewat alur end-to-end di RUNBOOK.

## 4. Pembagian Peran (tim 5 orang)

Selaras dengan rencana implementasi (`docs/superpowers/plans/`):

| Peran | Area | Berkas utama |
|---|---|---|
| Persistensi & basis data | penyimpanan, penskoran | `ai/db.py`, `ai/persistence.py`, `ai/threat_scorer.py`, `schema.sql` |
| Data & simulasi | generator serangan sintetis | `tools/attack_simulator.py` |
| Machine Learning | fitur & model *threat hunting* | `ai/features.py`, `ai/detection.py`, `tools/train_model.py` |
| Respons & honeypot | respons bertingkat, IOC, hub | `ai/response_engine.py`, `ai/ioc_export.py`, `hub/` |
| Dashboard & dokumen | UI + proposal/presentasi | `dashboard/src/`, `docs/proposal/` |

> Modul logika murni (Fase ML & respons) dapat dikerjakan paralel dari kontrak antarmuka sebelum data nyata tersedia, lalu diintegrasikan.

## 5. Konvensi

- **Pertahankan dekopling Redis** — layanan tidak boleh saling mengimpor kode atau memanggil langsung.
- **Pisahkan logika murni dari I/O** — logika (penskoran, fitur, tier, IOC) bebas efek samping & di-*unit test*; isolasi Redis/DB di konsumen/`db.py`.
- **Dokumentasikan kontrak** — setiap kanal Redis baru masuk tabel kanal di [ARSITEKTUR.md](ARSITEKTUR.md).
- **Dashboard memakai Next.js versi baru** — baca `dashboard/AGENTS.md` sebelum menyentuh frontend.

## 6. Siapa Menangani Apa

- **Pertanyaan arsitektur/desain** → [ARSITEKTUR.md](ARSITEKTUR.md), lalu pemilik area terkait (tabel §4).
- **Gagal menjalankan/men-deploy** → [RUNBOOK.md](RUNBOOK.md) (pemecahan masalah).
- **Konteks lomba & proposal** → `docs/proposal/` (BAB I–III, Abstrak, Daftar Pustaka).
