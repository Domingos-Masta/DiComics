# v1.0.4 - Enhanced Reading Modes & Code Refactoring

**Release Date:** January 9, 2026

## What's New

### 🎬 5 Reading Modes
- **Single Page** - One page at a time
- **Double Page** - Magazine-style dual view with 3D effect
- **Webtoon** - Vertical scrolling for web comics
- **Manga** - Right-to-left reading
- **Immersive** - Panel-by-panel with auto detection (NEW!)

### ✨ Immersive Mode Highlights
- Auto panel detection and sequencing
- Animated panel highlighting
- Real-time progress indicators
- Full-screen optimized

## Improvements

### Code Quality
- Centralized static data in models
- Removed 100+ lines of duplicate CSS
- New type-safe interfaces
- Improved security with HTML sanitization

### Performance
- Smaller bundle size
- Better code maintainability
- Cleaner architecture

## Changed Files
- `comic.model.ts` - New interfaces and constants
- `reader.component.ts/html/scss` - Complete refactoring
- `comic-details.component.ts` - Imported centralized modes
- `package.json` - Version 1.0.3 → 1.0.4

## Keyboard Shortcuts
- `←` `→` or `Space` - Navigate
- `B` - Bookmark
- `F` - Fullscreen
- `T` - Toggle sidebar

## Installation
```bash
npm install
npm run dist
```

---

For full details, see [CHANGELOG.md](./CHANGELOG.md)
