# RimCodex

RimCodex is a local-first desktop archive for turning a RimWorld colony — or any
worldbuilding project — into a living, linked notebook.

Keep colonists, factions, events, artifacts, locations and journals in one place.
Write in Markdown, connect records with links, and browse your colony as a wiki.
Everything stays in a folder on your computer.

- **Website:** https://ayyverty.github.io/projects/rimcodex/
- **Downloads:** https://github.com/ayyverty/colony-archive/releases/latest
- **Source:** https://github.com/ayyverty/colony-archive

## Who it's for

- RimWorld players documenting a long-running colony.
- Worldbuilders tracking people, places, factions and events.
- TTRPG groups keeping campaign notes linked.
- Writers and note-takers who want a private, offline notebook with a sci-fi
  archive feel.

## What you can do

### Write and organize

- Create pages, folders and tabs.
- Write in Markdown with a live preview.
- Autosave while you work, or save manually.
- Keep favorites and switch between multiple archives.
- Use focus mode for distraction-free writing.
- Browse the archive in different workspaces: archive, search, diagnostics,
  graph, timeline and manual.

### Link and explore

- Connect pages with wiki-style links.
- See backlinks to find everything that references the current page.
- Tag pages and filter by tag.
- Hover over links for previews.
- Get related-page suggestions while editing.
- Search records and use the command palette to jump anywhere.
- Turn an unresolved `[[link]]` into a new page with one click.

### Build a colony archive

- Colonist pages can render dossier cards with traits, skills, mood and health.
- Faction pages show relationships and known members.
- Artifact and relic pages track origin, powers and current holder.
- Journey pages render step-by-step routes with waypoints.
- The timeline turns dated records into a chronological mission log.
- The relationship graph shows how people, factions and places connect.
- The dashboard summarizes colony counts, stubs, recent events and tags.
- Add settlement context, faction alignment, archivist status and a colony
  status banner from archive metadata.
- In-game colony dates can be advanced or synced from the title bar.

### Write faster

- Create pages from templates for colonists, factions, items, events, locations
  and journeys.
- Type `/` at the start of a line for slash commands.
- Get frontmatter suggestions and starter fields while typing.
- Convert an existing page to a page type.
- Add colonist, faction or other metadata with one click.
- Save any page as a reusable template.
- Attach images and audio as evidence.
- Use infoboxes, stub notices, tables and redacted callouts.

### Keep the archive healthy

- Run an integrity scan for broken links, empty files, malformed metadata and
  orphan pages.
- Browse version history and restore earlier revisions.
- Keep an append-only operator log.
- File quick notes and dispatches in the inbox, then promote them to pages.
- Seal folders behind a passphrase.
- See contextual empty states with one-click next steps.
- Read feature tips in the empty editor state.

### Present and share

- Export a single record or the whole archive as styled HTML or PDF.
- Exports include an in-fiction as-built footer.
- Use themes, era skins, focus mode, typewriter scrolling, CRT-style display
  and optional keyboard clicks.
- Add signature stamps, handwritten note styling and scanned-document styling.
- Render classified pages with redaction and provenance stamps.

## Getting started

1. Download the latest Windows release from the project page or releases page.
2. Launch RimCodex.
3. Mount a folder. That folder becomes your archive.
4. Read the Welcome record and Operator's Manual.
5. Create your first page and start linking.

The tree lists Markdown files and folders. Dotfiles, tooling folders and
symlinked directories are skipped automatically.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Open the command palette |
| `Ctrl/Cmd + S` | Save the current record |
| `Ctrl/Cmd + P` | Toggle preview |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Ctrl/Cmd + N` | New page |
| `Ctrl/Cmd + Shift + N` | New folder |
| `Ctrl/Cmd + O` | Mount an archive |
| `Ctrl/Cmd + Shift + F` | Focus mode |
| `F1`–`F6` | Switch workspaces |
| `F2` | Rename the selected entry |

Right-click any tree row for new page, new folder, rename, reveal and delete.
Delete moves entries to the system recycle bin.

## Privacy

Your archive is a normal folder of Markdown files. RimCodex does not upload your
notes by default. You can back up, move or edit the folder with any other tool.

## Learn more

- The built-in Operator's Manual is a real page inside the archive and documents
  every feature with working examples.
- The command palette is a searchable index of the whole app.
- The diagnostics panel reports archive health and suggests features to try.

## License

MIT. See `LICENSE` if included with your copy. (If no LICENSE file is present,
the project is still marked MIT in `package.json`.)