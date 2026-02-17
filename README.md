# WritingTools Vibe MVP

Local-first desktop MVP with Tauri + React + TypeScript + SQLite.

## Run

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Iteration 1 Manual Test Checklist

1. Create screenplay project, add 3 scenes, reorder, restart.
2. Script editor shortcuts: Ctrl/Cmd+1~5 inserts snippets.
3. Export `.fountain` creates merged text in scene order.
4. Create 3 notes with `[[links]]`, check backlinks.
5. Create MOC note with links, click output generation.
6. In output page click create screenplay project and verify generated scenes.
7. In research add manual brief, attach to scene, verify on script right panel.
8. Save brief as clipping and verify new note keeps source URL.
