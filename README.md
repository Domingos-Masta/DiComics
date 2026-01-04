# DIComics

**DIComics** is an **open-source, cross-platform comic reader and library manager** built with **Angular** and **Electron**.

It provides a fast, offline-first desktop experience for organizing and reading digital comics, optimized for users with **large local collections** who want simplicity, performance, and control over their data.

> No cloud lock-in. No accounts. Your comics stay on your machine.

---

## ✨ Key Features

### 📚 Library Management
- Import comics from local folders
- Automatic indexing of image-based comics
- Organize by folder, series, volume, or issue
- Persistent local catalog

### 📖 Reading Experience
- Smooth page navigation
- Fit-to-height / fit-to-width modes
- Zoom and pan
- Vertical and horizontal reading
- Keyboard and mouse shortcuts

### ⚡ Desktop-First
- Native desktop experience via Electron
- Offline-first (no internet required)
- Optimized for large libraries

### 🖥 Cross-Platform
- macOS (Apple Silicon & Intel)
- Windows
- Linux

---

## 🖼 Screenshots

> _Screenshots are illustrative. UI may evolve._

### Library View
![Library View](./screenshots/library.png)

### Reader View
![Reader View](./screenshots/reader.png)

### Folder Import
![Folder Import](./screenshots/import.png)

> Place screenshots in a `/screenshots` folder at the project root.

---

## 🧱 Tech Stack

- **Frontend**: Angular
- **Desktop Runtime**: Electron
- **Language**: TypeScript
- **Packaging & Distribution**: electron-builder
- **Storage**: Local filesystem

---

## 📁 Project Structure

```text
di-comics/
├── electron/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Secure IPC bridge
│   └── electron.ts
│
├── src/
│   ├── app/             # Angular application
│   ├── assets/
│   └── environments/
│
├── screenshots/
├── dist/
├── angular.json
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Angular CLI** ≥ 16

---

### Installation

```bash
git clone https://github.com/<your-org>/di-comics.git
cd di-comics
npm install
```

---

## 🧪 Development

### Run Angular (web)

```bash
npm run start
```

### Run Electron + Angular (desktop dev)

```bash
npm run electron:serve
```

---

## 📦 Production Build

```bash
npm run build
npm run electron:build
```

---

## 🔄 Auto-Updates

DIComics supports **auto-updates** using **electron-updater**.

Updates are delivered via **GitHub Releases** and applied only after user confirmation.

---

## 🔐 Security

- `contextIsolation: true`
- `nodeIntegration: false`
- Secure IPC via preload scripts

---

## 📚 Supported Formats

- Image folders (`.png`, `.jpg`, `.jpeg`, `.webp`)
- CBZ (optional)

---

## 🛣 Roadmap

- Metadata support (ComicInfo.xml)
- Reading progress tracking
- Bookmarks
- Themes
- Optional sync

---

## 🤝 Contributing

Contributions are welcome. Please submit pull requests with clear descriptions and ensure platform compatibility.

---

## 📄 License

MIT License.

---

## 👤 Maintainer

**DIComics** – Open-source comic reader and manager built with Angular & Electron.
