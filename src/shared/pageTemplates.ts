export interface PageTemplate {
  id: string
  label: string
  description: string
  type: string
  frontmatter: Record<string, string | string[]>
  body: string
  manualAnchor: string
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Empty Markdown record.',
    type: 'page',
    frontmatter: { title: '', type: 'page' },
    body: '# \n',
    manualAnchor: 'templates'
  },
  {
    id: 'colonist',
    label: 'Colonist',
    description: 'Crew member with backstory, traits, skills and health.',
    type: 'colonist',
    frontmatter: {
      title: '',
      type: 'colonist',
      status: 'alive',
      backstory: '',
      traits: [],
      skills: [],
      health_conditions: [],
      mood: 'content'
    },
    body: '# \n\n## Notes\n\n',
    manualAnchor: 'templates'
  },
  {
    id: 'faction',
    label: 'Faction',
    description: 'A colony faction or group.',
    type: 'faction',
    frontmatter: {
      title: '',
      type: 'faction',
      stance: 'neutral',
      leader: '',
      relations: []
    },
    body: '# \n\n## Known members\n\n## Relations\n\n',
    manualAnchor: 'templates'
  },
  {
    id: 'item',
    label: 'Item',
    description: 'Artifact, weapon, or tool.',
    type: 'item',
    frontmatter: {
      title: '',
      type: 'item',
      origin: '',
      powers: [],
      current_holder: ''
    },
    body: '# \n\n## Description\n\n',
    manualAnchor: 'templates'
  },
  {
    id: 'event',
    label: 'Event',
    description: 'Dated colony event.',
    type: 'event',
    frontmatter: {
      title: '',
      type: 'event',
      date: '',
      location: '',
      outcome: ''
    },
    body: '# \n\n## Summary\n\n',
    manualAnchor: 'templates'
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Place, biome, or settlement.',
    type: 'location',
    frontmatter: {
      title: '',
      type: 'location',
      region: '',
      faction: ''
    },
    body: '# \n\n## Notes\n\n',
    manualAnchor: 'templates'
  },
  {
    id: 'journey',
    label: 'Journey',
    description: 'Caravan or expedition log.',
    type: 'journey',
    frontmatter: {
      title: '',
      type: 'journey',
      itinerary: []
    },
    body: '# \n\n## Route\n\n',
    manualAnchor: 'templates'
  },
  {
    id: 'handwritten',
    label: 'Handwritten note',
    description: 'Personal note in handwriting style.',
    type: 'handwritten',
    frontmatter: {
      title: '',
      type: 'handwritten'
    },
    body: '# \n\n',
    manualAnchor: 'templates'
  }
]

export function inferTypeFromPath(path: string): string | null {
  const lower = path.toLowerCase()
  if (lower.includes('colonist')) return 'colonist'
  if (lower.includes('faction')) return 'faction'
  if (lower.includes('item') || lower.includes('artifact')) return 'item'
  if (lower.includes('event')) return 'event'
  if (lower.includes('location')) return 'location'
  if (lower.includes('journey') || lower.includes('caravan')) return 'journey'
  return null
}

export function starterFrontmatterForType(type: string | null): Record<string, string | string[]> {
  const template = PAGE_TEMPLATES.find((entry) => entry.type === type)
  if (!template) return { title: '', type: type ?? 'page' }
  return { ...template.frontmatter }
}

export function fieldSuggestionsForType(type: string | null): Array<{ field: string; description: string }> {
  switch (type) {
    case 'colonist':
      return [
        { field: 'title', description: 'Record title' },
        { field: 'type', description: 'Page type' },
        { field: 'status', description: 'alive, dead, off-world' },
        { field: 'backstory', description: 'Short character backstory' },
        { field: 'traits', description: 'Personality traits' },
        { field: 'skills', description: 'Skill: value pairs' },
        { field: 'health_conditions', description: 'Injuries and conditions' },
        { field: 'mood', description: 'Current mood' }
      ]
    case 'faction':
      return [
        { field: 'title', description: 'Faction name' },
        { field: 'type', description: 'Page type' },
        { field: 'stance', description: 'allied, neutral, hostile' },
        { field: 'leader', description: 'Linked leader' },
        { field: 'relations', description: 'Faction relations' }
      ]
    case 'item':
      return [
        { field: 'title', description: 'Item name' },
        { field: 'type', description: 'Page type' },
        { field: 'origin', description: 'Where it came from' },
        { field: 'powers', description: 'Special powers' },
        { field: 'current_holder', description: 'Linked holder' }
      ]
    case 'event':
      return [
        { field: 'title', description: 'Event name' },
        { field: 'type', description: 'Page type' },
        { field: 'date', description: 'RimWorld date' },
        { field: 'location', description: 'Where it happened' },
        { field: 'outcome', description: 'Result' }
      ]
    default:
      return [
        { field: 'title', description: 'Record title' },
        { field: 'type', description: 'Page type' },
        { field: 'classification', description: 'public, internal, classified' },
        { field: 'tags', description: 'Tags' },
        { field: 'aliases', description: 'Aliases' },
        { field: 'date', description: 'RimWorld date' }
      ]
  }
}

export function valueSuggestionsForField(field: string): string[] {
  switch (field) {
    case 'classification':
      return ['public', 'internal', 'classified']
    case 'status':
      return ['alive', 'dead', 'off-world', 'destroyed']
    case 'stance':
      return ['allied', 'neutral', 'hostile']
    case 'type':
      return ['colonist', 'faction', 'item', 'event', 'location', 'journey', 'handwritten', 'page']
    case 'origin':
      return ['recovered', 'intercepted']
    default:
      return []
  }
}