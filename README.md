# HoneyMind

**Platform deception siber aktif & intelijen lawan berbasis kecerdasan buatan.**

HoneyMind menyamar sebagai server Ubuntu melalui SSH untuk memikat penyerang, lalu menjalankan **loop pertahanan otonom** di atas mereka: menyimpan setiap aksi, meniru terminal dengan *Large Language Model* (Google Gemini), **memburu ancaman** dengan *machine learning* (klasterisasi arketipe + deteksi anomali), dan **merespons secara otonom** secara bertingkat — memperdalam tipuan, *tarpit* sesi bermusuhan, hingga mengekspor *Indicator of Compromise* (IOC) untuk perimeter nyata. Semuanya mengalir ke dashboard langsung yang memvisualkan serangan sebagai graf *kill-chain*.

Ini adalah alat **defensif** untuk "domain kelima": alih-alih sekadar menghadang di gerbang, ia mempelajari penyerang di dalam umpan terkendali dan mengubah perilakunya menjadi intelijen yang dapat ditindaklanjuti.

> Dikembangkan untuk **Hackathon WRECK-IT 7.0** (Subtema 1: *Autonomous Defense & AI-Driven Threat Hunting*).

## Fitur Utama

- **Deception dinamis berbasis LLM** — respons terminal kontekstual yang sulit di-*fingerprint* (berbeda dari honeypot statis seperti Cowrie/Kippo).
- **Threat hunting ML** — `ThreatHunter` mengklasifikasi sesi ke arketipe (`benign`/`suspicious`/`aggressive`) dengan KMeans + skor anomali Isolation Forest.
- **Respons otonom bertingkat** — perdalam tipuan → *tarpit* → ekspor IOC, dipicu oleh skor & ML.
- **Dashboard intelijen** — umpan terminal, pohon *kill-chain*, panel arketipe/skor/tier, dan umpan IOC langsung.
- **Arsitektur ter-dekopel** — tiga layanan yang hanya berkomunikasi via Redis pub/sub.

## Arsitektur Singkat

Tiga layanan ter-dekopel: **Hub** (Node.js/ssh2) → **Redis** → **AI Layer** (Python/FastAPI) → **PostgreSQL**, dengan **Dashboard** (Next.js) berlangganan keluaran intelijen.

![Arsitektur Sistem HoneyMind](docs/figures/architecture.png)

📖 Penjelasan lengkap: **[docs/ARSITEKTUR.md](docs/ARSITEKTUR.md)**.

## Mulai Cepat

```bash
docker compose up -d                      # Redis + PostgreSQL
cd ai && pip install -r requirements.txt && uvicorn main:app --reload
cd hub && npm install && node server.js   # honeypot SSH di :2222
cd dashboard && npm install && npm run dev # dashboard di :3000
```

Coba: `ssh root@localhost -p 2222` (kata sandi bebas).
Langkah lengkap, pelatihan model, demo, dan pemecahan masalah: **[docs/RUNBOOK.md](docs/RUNBOOK.md)**.

## Struktur Proyek

```
honeymind/
├── hub/          # honeypot SSH (Node.js/ssh2): server, router, publisher Redis
├── ai/           # otak & pemburu ancaman (Python/FastAPI): persistence, ThreatHunter, response_engine, ioc_export, llm_engine
├── dashboard/    # command center (Next.js/React/Socket.IO)
├── tools/        # attack_simulator.py, train_model.py
├── docs/         # ARSITEKTUR, RUNBOOK, ONBOARDING, proposal/, plans/
├── schema.sql    # tabel PostgreSQL
└── docker-compose.yml
```

## Pengujian

```bash
cd ai && pytest        # 24 unit test (logika skoring, fitur, deteksi, tier, IOC)
```
Logika murni di-*unit test*; lapisan Redis/DB/SSH/React diverifikasi lewat alur end-to-end (lihat RUNBOOK).

## Dokumentasi

| Dokumen | Untuk |
|---|---|
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Desain, alur data, keputusan & trade-off |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Menjalankan, mendemokan, memecahkan masalah |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Orientasi anggota tim baru |
| [docs/proposal/](docs/proposal/) | Proposal lomba (BAB I–III, Abstrak, Daftar Pustaka) |

## Keamanan & Etika

Honeypot adalah **alat riset defensif**. Operasikan HoneyMind hanya pada infrastruktur yang Anda miliki atau diizinkan, terisolasi dari sistem produksi. Kredensial umpan (mis. `.env`) dan saran aturan blokir adalah untuk penggunaan defensif Anda; data tipuan sengaja dipalsukan. Jangan gunakan proyek ini untuk menjebak, menyerang, atau menipu sistem/orang yang tidak Anda kendalikan.
