# Waka-chan wa Kyou mo Azatoi

> —Tomoya, mahasiswa tahun pertama yang masih perjaka dan bertekad punya pacar, mulai akrab dengan gadis cantik berhati lembut dari klub yang sama, Sakuraba Waka. Namun, ia tak punya cukup keberanian untuk mengambil langkah pertama. Hingga suatu hari, Tomoya tanpa sengaja menyaksikan “sisi lain” dari Waka…?

---

## Info

| | |
|---|---|
| Judul | Waka-chan wa Kyou mo Azatoi |
| Judul Alternatif | 和歌ちゃんは今日もあざとい |
| Author | Shimamura |
| Tipe | Webtoon (Berwarna) |
| Status | Tamat (Chapter 223) |
| Genre | Drama · Shounen · Comedy · Romance · School Life · Slice of Life |
| Chapter | 216 chapter |

## Link

- [MangaDex](https://mangadex.org/title/57fe3f00-8626-462b-8f75-fce0e6faa6be/a-hidden-side-to-my-crush)
- [Raw](https://www.comico.jp/comic/908)

---

## Struktur

```
Waka-chan/
├── manga-config.json     # Metadata manga
├── manga.json            # Data chapter (auto-generated)
├── manga-automation.js   # Script automation
├── encrypt-manifest.js   # Script enkripsi manifest
├── daily-views.json      # Data views harian
└── <chapter>/
    └── manifest.json     # Daftar halaman (encrypted)
```

## Automation

Semua proses berjalan otomatis via GitHub Actions:

1. Push chapter baru (folder + manifest.json)
2. `encrypt-manifest.yml` — enkripsi manifest
3. `manga-automation.yml` — regenerate manga.json
4. Trigger rebuild ke website utama
5. `sync-cover.yml` — sinkronisasi cover dari website

---

Bagian dari [Nurananto Scanlation](https://nuranantoscans.my.id)