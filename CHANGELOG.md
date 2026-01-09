# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-01-09

### Added
- **Multiple Reading Modes**:
  - Single Page: Traditional single-page reading
  - Double Page: Side-by-side dual-page view with 3D perspective
  - Webtoon: Vertical continuous scrolling for web comics
  - Manga: Right-to-left reading with perspective effects
  - Immersive: Panel-by-panel reading with automatic panel detection
- **Immersive Mode Features**:
  - Automatic panel detection and sequencing (LTR)
  - Panel highlighting with animated glow effect
  - Real-time panel and page progress indicators
  - Smooth panel-to-panel navigation
- **Sanitized SVG Icons**:
  - All reading modes have visual SVG icons
  - Proper SafeHtml rendering for security
  - Cross-component icon consistency

### Changed
- **Code Refactoring**:
  - Moved static data (reading modes, music genres, months) from components to models
  - Created new interfaces: `ViewMode`, `FitModeOption`, `MusicGenreOption`, `MonthOption`, `Panel`
  - Centralized constants in `comic.model.ts` for better maintainability
  - Updated Reader component to use imported modes instead of hardcoded values
  - Updated Comic Details component to import modes from models
- **Reader Component**:
  - Refactored reading mode handling with switch statement
  - Added panel detection and navigation logic
  - Implemented `loadPanelsForPage()` for immersive mode
  - Updated `nextPages()`/`previousPage()` to handle all reading modes
  - Added `getCurrentPanel()` method for immersive display
  - Integrated DomSanitizer for SVG icon rendering
- **Component Templates**:
  - Reader HTML updated with `@switch` for mode-based rendering
  - All mode buttons now use imported modes with sanitized icons
  - Added immersive panel display with position highlights
  - Improved semantic HTML structure
- **Styling Improvements**:
  - Added comprehensive styles for webtoon, manga, and immersive modes
  - Panel animation with `panelPulse` keyframe animation
  - SVG icon styling for proper color inheritance
  - Removed duplicate and unused CSS rules
  - Fixed SCSS compatibility warnings

### Removed
- Duplicate static data definitions from components
- Unused CSS classes and rules
- Hardcoded mode arrays from component TypeScript files

## [0.1.0] - 2026-01-09

### Added
- **New Components**:
  - About Component: Displays application information, features, and copyright/license details
  - Comic Details Component: Shows comprehensive comic information and metadata
- **New Services**:
  - Music Service: Manages background sound effects and audio playback
  - Database Service: Foundation for future data persistence enhancements
- **UI Assets**:
  - SVG Icons: Upload, search, refresh, settings, index, about, immersive icons
  - Logo Assets: PNG versions of DiComics logo in multiple sizes
  - Icon Assets: Windows ICO files for application branding
- **Audio Assets**:
  - Background music tracks for immersive reading experience (4 tracks)
  - Gotham City Epic Cinematic Orchestral
  - Joking Sound Humorous
  - Sneaky Background Music
  - Suspense Tension Background Music
- **UI/UX Enhancements**:
  - Context menus for comic cards with multiple actions
  - Enhanced home component with improved layout and controls
  - Glass-effect styling for modern UI appearance
  - Splash component with visual improvements
- **Feature Additions**:
  - Smart comic management interface
  - Background sound effects integration
  - Immersive reading environment styling
  - Enhanced copyright and license information display

### Changed
- **Home Component**:
  - Refactored layout for better usability
  - Added context menu system for comic operations
  - Improved filtering and sorting interfaces
  - Enhanced visual design with glass-effect elements
- **Reader Component**:
  - Updated navigation methods
  - Improved page interaction handling
- **Electron Configuration**:
  - Reorganized icon assets into structured directories
  - Updated main.js and preload.js scripts
  - Added build configuration for multiple platforms
- **Asset Structure**:
  - Consolidated old icon assets into legacy directory
  - Created organized SVG assets directory
  - Added dedicated music assets directory
  - Separated image assets by type

### Improved
- **Build System**: Enhanced Angular configuration with proper asset paths
- **Developer Experience**: Better asset organization and file structure
- **Visual Design**: Modern glass-effect UI components throughout the application
- **Comic Model**: Extended properties for enhanced metadata handling

### Removed
- Sample comic file (example assets)
- Outdated icon versions (moved to legacy directory)

---

## [0.0.1] - 2026-01-05

### Added
- **Project Branding**: Official rebranding from "bdhq-reader" to "DiComics"
- **Author Information**: Added project author metadata (Domingos Fernando)
- **Project Description**: Comprehensive description of the application's purpose and features
- **XML Support**: Added `fast-xml-parser` dependency for enhanced metadata parsing
- **Build Configuration**: 
  - Added Electron Builder configuration with app icons
  - Defined build resources directory structure
  - Added icon paths for Windows (.ico) and macOS (.icns)
- **Reader Navigation**: 
  - New `goToPageSec()` method for slider-based page navigation
  - Refactored page navigation logic for better separation of concerns
- **Indexing Improvements**: 
  - Fixed quick scan completion event handling
  - Added proper completion status to `indexingCompleted` event

### Changed
- **Package Metadata**:
  - Updated project name to "dicomics"
  - Bumped version from 0.0.0 to 0.0.1
  - Updated Electron Builder product name to match rebranding
- **Component References**: 
  - Updated app title signal to reflect new project name
  - Updated test expectations to use "dicomics" naming
  - Changed home component splash text
- **Reader Component**: 
  - Refactored `goToPage()` method signature for clarity
  - Improved method naming consistency with `goToPageSec()`

### Fixed
- **Code Quality**: 
  - Removed extra blank line in home component upload section
  - Improved variable naming in reader component image URL handling

### Improved
- **Build Process**: Enhanced electron-builder configuration with proper asset paths
- **Developer Experience**: Better separation of concerns in reader component navigation methods
- **Indexing Service**: More reliable event emission for quick scan operations

---

## [0.0.0] - Initial Release

### Initial Features
- Angular-based desktop application for reading digital comics
- Support for CBZ and CBR archive formats
- Comic library management with indexing
- Reading progress tracking
- Bookmark functionality
- Local storage of comic metadata
- Electron desktop integration
- Settings management

---

## Future Enhancements

### Planned Features
- [ ] Advanced search and filtering enhancements
- [ ] Tag and category organization system
- [ ] Comic series recognition and grouping
- [ ] Cloud synchronization capabilities
- [ ] Mobile companion app
- [ ] Performance optimizations for large libraries
- [ ] Custom themes and UI customization
- [ ] Batch operations for library management
- [ ] Reading recommendations based on history
- [ ] Comic metadata fetching from online sources
- [ ] User authentication and cloud backup
- [ ] Advanced statistics and reading analytics

---

### Added
- **Project Branding**: Official rebranding from "bdhq-reader" to "DiComics"
- **Author Information**: Added project author metadata (Domingos Fernando)
- **Project Description**: Comprehensive description of the application's purpose and features
- **XML Support**: Added `fast-xml-parser` dependency for enhanced metadata parsing
- **Build Configuration**: 
  - Added Electron Builder configuration with app icons
  - Defined build resources directory structure
  - Added icon paths for Windows (.ico) and macOS (.icns)
- **Reader Navigation**: 
  - New `goToPageSec()` method for slider-based page navigation
  - Refactored page navigation logic for better separation of concerns
- **Indexing Improvements**: 
  - Fixed quick scan completion event handling
  - Added proper completion status to `indexingCompleted` event

### Changed
- **Package Metadata**:
  - Updated project name to "dicomics"
  - Bumped version from 0.0.0 to 0.0.1
  - Updated Electron Builder product name to match rebranding
- **Component References**: 
  - Updated app title signal to reflect new project name
  - Updated test expectations to use "dicomics" naming
  - Changed home component splash text
- **Reader Component**: 
  - Refactored `goToPage()` method signature for clarity
  - Improved method naming consistency with `goToPageSec()`

### Fixed
- **Code Quality**: 
  - Removed extra blank line in home component upload section
  - Improved variable naming in reader component image URL handling

### Improved
- **Build Process**: Enhanced electron-builder configuration with proper asset paths
- **Developer Experience**: Better separation of concerns in reader component navigation methods
- **Indexing Service**: More reliable event emission for quick scan operations

---

## [0.0.0] - Initial Release

### Initial Features
- Angular-based desktop application for reading digital comics
- Support for CBZ and CBR archive formats
- Comic library management with indexing
- Reading progress tracking
- Bookmark functionality
- Local storage of comic metadata
- Electron desktop integration
- Settings management

---

## Future Enhancements

### Planned Features
- [ ] Advanced search and filtering
- [ ] Tag and category organization
- [ ] Comic series recognition
- [ ] Cloud synchronization
- [ ] Mobile companion app
- [ ] Performance optimizations for large libraries
- [ ] Custom themes and UI customization
- [ ] Batch operations for library management
- [ ] Reading recommendations based on history
- [ ] Comic metadata fetching from online sources

---

## Version History

| Version | Date       | Status     | Notes                  |
|---------|------------|------------|------------------------|
| 0.0.1   | 2026-01-05 | Current    | Project rebranding     |
| 0.0.0   | TBD        | Initial    | Initial release        |

---

## Contributing

When adding changes, please update this CHANGELOG.md file following these guidelines:

1. Add changes under the "Unreleased" section before a new version is released
2. Group changes into categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. Use clear, descriptive language
4. Link to relevant issues or PRs when applicable
5. Keep the changelog user-focused (describe impact, not implementation details)

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

---

*Last Updated: January 5, 2026*
