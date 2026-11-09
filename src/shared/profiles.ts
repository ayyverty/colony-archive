import type { ArchiveMeta, ArchiveProfile } from './types'

export const PROFILE_PRESETS: Record<string, ArchiveProfile> = {
  generic: {
    preset: 'generic',
    archive: 'Archive',
    character: 'Character',
    group: 'Group',
    item: 'Item',
    location: 'Location',
    event: 'Event',
    journey: 'Journey',
    keeper: 'Keeper',
    inbox: 'Inbox',
    log: 'Log'
  },
  worldbuilding: {
    preset: 'worldbuilding',
    archive: 'World',
    character: 'Character',
    group: 'Faction',
    item: 'Artifact',
    location: 'Location',
    event: 'Event',
    journey: 'Journey',
    keeper: 'Chronicler',
    inbox: 'Dispatches',
    log: 'Journal'
  },
  dnd: {
    preset: 'dnd',
    archive: 'Campaign',
    character: 'Character',
    group: 'Faction',
    item: 'Item',
    location: 'Location',
    event: 'Event',
    journey: 'Journey',
    keeper: 'GM',
    inbox: 'Inbox',
    log: 'Session Log'
  },
  novel: {
    preset: 'novel',
    archive: 'Story',
    character: 'Character',
    group: 'Group',
    item: 'Artifact',
    location: 'Place',
    event: 'Scene',
    journey: 'Journey',
    keeper: 'Author',
    inbox: 'Notes',
    log: 'Journal'
  },
  rimworld: {
    preset: 'rimworld',
    archive: 'Colony',
    character: 'Colonist',
    group: 'Faction',
    item: 'Artifact',
    location: 'Location',
    event: 'Event',
    journey: 'Journey',
    keeper: 'Archivist',
    inbox: 'Transmissions',
    log: 'Operator Log'
  }
}

export const DEFAULT_PROFILE = PROFILE_PRESETS.generic

export function profileFromMeta(meta: Record<string, unknown> | null | undefined): ArchiveProfile {
  const terms = [
    'archive',
    'character',
    'group',
    'item',
    'location',
    'event',
    'journey',
    'keeper',
    'inbox',
    'log'
  ] as const
  const profile: ArchiveProfile = { ...DEFAULT_PROFILE }
  const presetName = typeof meta?.profile === 'string' ? meta.profile : ''
  if (presetName && presetName in PROFILE_PRESETS) {
    Object.assign(profile, PROFILE_PRESETS[presetName])
  }
  if (presetName && !(presetName in PROFILE_PRESETS)) profile.preset = presetName
  for (const term of terms) {
    const key = `term_${term}` as keyof ArchiveMeta
    const value = meta?.[key]
    if (typeof value === 'string' && value.trim()) profile[term] = value.trim()
  }
  return profile
}

export function profileToFields(profile: ArchiveProfile): Record<string, string> {
  return {
    profile: profile.preset,
    term_archive: profile.archive,
    term_character: profile.character,
    term_group: profile.group,
    term_item: profile.item,
    term_location: profile.location,
    term_event: profile.event,
    term_journey: profile.journey,
    term_keeper: profile.keeper,
    term_inbox: profile.inbox,
    term_log: profile.log
  }
}

export function typeAliases(): Record<string, string> {
  return {
    colonist: 'character',
    person: 'character',
    npc: 'character',
    member: 'character',
    faction: 'group',
    guild: 'group',
    house: 'group',
    artifact: 'item',
    relic: 'item',
    place: 'location',
    region: 'location',
    settlement: 'location',
    session: 'event',
    battle: 'event',
    discovery: 'event',
    route: 'journey',
    expedition: 'journey',
    animal: 'creature',
    mechanoid: 'creature'
  }
}
