export const MANUAL_TITLE = 'RimCodex Operator’s Manual'

export const MANUAL_MARKDOWN = `---
title: RimCodex Operator's Manual
type: manual
classification: internal
tags: [manual, help]
---

# RimCodex Operator's Manual

This manual is a normal archive record. Edit it, link to it, and restore it from history.

## Archive profiles and presets

RimCodex can describe any kind of archive. Choose a profile in
**SYSTEM → ARCHIVE PROFILE…** to change the words used throughout the app.

| Preset | Best for | Example terms |
| --- | --- | --- |
| Generic Archive | Notes, research, mixed projects | Archive, Character, Group, Event |
| Worldbuilding | Settings and fictional worlds | World, Character, Faction, Location |
| D&D Campaign | Tabletop campaigns | Campaign, Character, Faction, Session, GM |
| Novel / Story | Fiction and story planning | Story, Character, Group, Scene, Artifact |
| RimWorld Colony | RimWorld playthroughs | Colony, Colonist, Faction, Event, Archivist |

A preset changes labels such as the archive name, characters, groups, items,
locations, events, journeys, inbox, log, and keeper title. It does not rename or
change your pages.

Choose **Custom** to edit every label yourself. The preview updates before you save.

Existing archives keep their current labels until you choose a new preset.

### Calendar and date format

Open **SYSTEM → CALENDAR & DATE FORMAT…** to choose a calendar preset and format.

- RimWorld: \`{year} · {monthName} {day}\`
- ISO: \`{year}-{month:02}-{day:02}\`
- Long: \`{dayOrdinal} of {monthName}, {year}\`
- D&D: \`{dayOrdinal} of {monthName}, {year} {era}\`

Dates are stored as \`YYYY-MM-DD\`. Month names and month lengths can be customized
for calendars such as D&D.

## Mounting

Mount a folder with \`MOUNT ARCHIVE…\` or \`Ctrl O\`. The archive is confined to that folder.

## Workspaces

- \`F1 ARCHIVE.EXE\` — the wiki
- \`F2 INDEXER.SVC\` — search and backlinks
- \`F3 DIAGNOSTICS.SYS\` — health and integrity scans
- \`F4 GRAPH.SVC\` — relationship graph
- \`F5 MANUAL.SYS\` — this manual
- \`F6 TIMELINE.SVC\` — chronological mission log

## Linking

Use \`[[Page]]\`, \`[[Page#Heading]]\`, and \`[[Page|label]]\`. Unresolved links show a \`+\` create affordance.

## Templates

Use **New Page** to choose a template. Templates are ordinary Markdown with frontmatter.

\`\`\`md
---
title: New Colonist
type: colonist
status: alive
traits: []
skills: []
---
\`\`\`

## Slash commands

Type \`/\` at the start of a line. Try \`/colonist\`, \`/faction\`, \`/timestamp\`, \`/redacted\`, and \`/table\`.

## Frontmatter

Type \`---\` at the top of a page to get field suggestions. Common fields include \`title\`, \`type\`, \`classification\`, \`tags\`, \`aliases\`, and \`date\`.

## Classification

Use \`classification: public | internal | classified\`. Classified pages redact \`:::redacted\` sections.

## Attachments

Drop images or audio into the editor. They are stored in \`_attachments/\` and render with \`![[file.png]]\`.

## See also

The **SEE ALSO** rail suggests related records. Pages with no outbound links show a nudge.

## Integrity scan

Run \`DIAGNOSTICS.SYS\` to scan for broken links, empty records, malformed frontmatter, and orphans.

## Error codes

- \`E-041 ARCHIVE UNREACHABLE\`
- \`E-102 PATH REJECTED\`
- \`E-117 MALFORMED FRONTMATTER\`
- \`E-118 EMPTY RECORD\`
- \`E-203 UNRESOLVED LINK\`
- \`E-204 ORPHAN RECORD\`
- \`E-301 SAVE FAILED\`
- \`E-404 RECORD NOT FOUND\`
`
