# Runbook — Menjalankan & Mengoperasikan HoneyMind

> **Kapan memakai runbook ini:** menjalankan seluruh sistem secara lokal, menyiapkan demo (mis. babak final on-site), atau memverifikasi sistem berfungsi.
> Untuk pemahaman desain, lihat [ARSITEKTUR.md](ARSITEKTUR.md).

## Prasyarat

- **Docker** + Docker Compose (Redis & PostgreSQL)
- **Node.js** 18+ (hub & dashboard)
- **Python** 3.10+ (AI layer & tooling)
- Opsional: **`GEMINI_API_KEY`** (hanya untuk respons terminal LLM; pipeline intel berjalan tanpa kunci ini)

## Menjalankan Stack (urutan)

```bash
# 1. Data store
docker compose up -d              # Redis :6379, PostgreSQL :5432 (skema auto-load)

# 2. AI Layer
cd ai
pip install -r requirements.txt
echo "GEMINI_API_KEY=isi_kunci_anda" > .env   # opsional
uvicorn main:app --reload
# Harapan: "Listening for AI requests..." & "Listening for SSH activity (persistence)..."

# 3. Hub (honeypot SSH) — terminal baru
cd hub
npm install
node server.js
# Harapan: "SSH Honeypot listening on port 2222"

# 4. Dashboard — terminal baru
cd dashboard
npm install
npm run dev                        # http://localhost:3000
```

## Menghasilkan Data & Melatih Model

```bash
# dari akar repo, dengan stack berjalan:
python tools/attack_simulator.py --all --rounds 3   # isi sesi realistis
python tools/train_model.py                          # latih + simpan model ML
# mulai ulang uvicorn agar model termuat
```

## Demo Cepat (sebagai "penyerang" ramah)

```bash
ssh root@localhost -p 2222         # kata sandi: apa saja
root@server:~# whoami              # jawaban statis instan
root@server:~# cat /etc/passwd     # dihasilkan AI; dashboard menyala
root@server:~# nmap 10.0.0.1       # skor naik — amati eskalasi tier
```

## Verifikasi

```bash
cd ai && pytest                    # harus 24 test lulus
# cek data tersimpan:
python -c "import db,os; c=db.get_connection();
import sys
with c.cursor() as cur:
    cur.execute('SELECT count(*) FROM commands_log'); print('perintah:', cur.fetchone()[0])"
```

## Pemecahan Masalah

| Gejala | Penyebab & Solusi |
|---|---|
| Port **5432** sudah dipakai / auth gagal | Ada PostgreSQL lain (mis. Laragon) di 5432. Jalankan PostgreSQL proyek di port lain dan setel env sebelum menjalankan AI layer & tooling: `export DATABASE_URL="postgresql://honeymind:password123@127.0.0.1:5433/honeymind_db"` |
| Hub gagal: `Cannot parse privateKey` | `host.key` lama berformat salah. Hapus `hub/host.key` lalu jalankan ulang `node server.js` (kunci akan dibuat ulang sebagai PKCS#1). |
| Perintah simulator/otomatis tidak tercatat | Pastikan memakai versi `hub/server.js` terbaru (memproses input per-karakter pada tiap *chunk*, bukan satu karakter per *event*). |
| Respons terminal kosong / "API Key not configured" | `GEMINI_API_KEY` belum disetel di `ai/.env`. Pipeline intel tetap berjalan; hanya respons LLM yang nonaktif. |
| AI layer tak menerima pesan | Pastikan Redis hidup (`docker compose ps`) dan AI layer terhubung ke `127.0.0.1:6379`. |
| `train_model.py`: "Not enough sessions" | Jalankan dulu `attack_simulator.py --all --rounds 3` untuk mengisi data (butuh ≥ 4 sesi). |

## Menghentikan & Membersihkan

```bash
# hentikan uvicorn / node (Ctrl+C di masing-masing terminal)
docker compose down                # hentikan Redis & PostgreSQL
# (opsional) hapus model hasil latih: rm ai/models/threat_hunter.joblib
```

## Eskalasi

Untuk isu desain/arsitektur, rujuk [ARSITEKTUR.md](ARSITEKTUR.md) dan rencana implementasi di `docs/superpowers/plans/`. Tabel pemilik komponen ada di [ONBOARDING.md](ONBOARDING.md).
