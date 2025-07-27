// 派系相关类型

export interface CourtPolitics {
  tension: number;
  stability: number;
  corruption: number;
  efficiency: number;
  recentEvents: Array<{
    eventId: string;
    impact: 'minor' | 'moderate' | 'major';
    faction: string;
    turn: number;
  }>;
}
export interface Faction {
  id: string;
  name: string;
  influence: number;
  leaderCharacterId?: string;
  memberCharacterIds: string[];
  agenda: string;
  conflictingFactions: string[];
  alliedFactions: string[];
}

export interface FactionSystem {
  activeFactions: Faction[];
  factionBalance: number;
}

export interface FactionEffect {
  faction: string;
  influenceChange: number;
}
