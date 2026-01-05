# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
