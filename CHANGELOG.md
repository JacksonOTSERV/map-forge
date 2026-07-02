# Changelog

All notable changes to Map Forge are documented here. Sections are generated from semantic commits at release time.

## [0.1.1] - 2026-07-02

### Added
- Interactive map import with a sprite-LOD preview.
- Cross-map clipboard with a replace-on-paste option.
- Hunt generator with route editing and spawn scatter.
- Action and unique ID panel with teleport targets and tile highlighting.
- Borderize brush with mountain and gravel borders.
- Doodad brushes with randomized assembly.
- Virtualized, searchable tile and brush pickers with thumbnails.
- Optional border editing in the tileset editor, preserving border attributes.
- Ctrl+scroll to change floors on the map canvas.
- Configurable default floor (sea level) in editor preferences.
- Adjustable undo/redo history budget in preferences.
- Custom data-folder preference with an option to copy existing data.
- Confirmation prompt when closing with unsaved changes.
- Loaded client version shown in the assets-ready status.
- Redesigned preferences dialog with sidebar navigation and format examples.
- Versioned client data now bundled with the installer.

### Fixed
- Map import expands the map bounds and drops content at the cursor.
- Hangable item rotation.

### Changed
- DAT parsing now enforces OTFI extended and transparency flags.

## [0.1.0] - 2026-06-30

First public release of Map Forge.
