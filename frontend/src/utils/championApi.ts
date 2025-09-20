// League of Legends Champion API utilities

import { ChampionData, ChampionListItem } from '../types/champion';

const CHAMPION_SQUARE_IMAGE_BASE_URL = 'https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/';

const CHAMPION_API_URL = 'https://ddragon.leagueoflegends.com/cdn/15.18.1/data/en_US/champion.json';

const CHAMPION_IMAGE_BASE_URL_LOADING = 'https://cdn.communitydragon.org/latest/champion/';
const CHAMPION_IMAGE_BASE_URL_LOADING_SKIN = '/splash-art/centered/skin/0';
/**
 * Fetches champion data from the Riot Games Data Dragon API
 */
export async function fetchChampionData(): Promise<ChampionData> {
  try {
    const response = await fetch(CHAMPION_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch champion data: ${response.status} ${response.statusText}`);
    }
    
    const data: ChampionData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching champion data:', error);
    throw error;
  }
}

/**
 * Converts champion data to a simplified list format for display
 */
export function formatChampionList(championData: ChampionData): ChampionListItem[] {
  return Object.values(championData.data).map(champion => ({
    id: champion.id,
    key: champion.key,
    name: champion.name,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Creates a dictionary mapping champion keys to champion data
 */
export function createChampionKeyMapping(championData: ChampionData): Record<string, ChampionListItem> {
  const mapping: Record<string, ChampionListItem> = {};
  
  Object.values(championData.data).forEach(champion => {
    mapping[champion.key.toString()] = {
      id: champion.id,
      key: champion.key,
      name: champion.name,
    };
  });
  
  return mapping;
}

/**
 * Gets champion data by key from the mapping
 */
export function getChampionByKey(championKey: string, championMapping: Record<string, ChampionListItem>): ChampionListItem | null {
  return championMapping[championKey] || null;
}

/**
 * Filters champions by name or tags
 */
export function filterChampions(champions: ChampionListItem[], searchTerm: string): ChampionListItem[] {
  if (!searchTerm.trim()) {
    return champions;
  }
  
  const term = searchTerm.toLowerCase();
  return champions.filter(champion => 
    champion.name.toLowerCase().includes(term) ||
    champion.key.toString().includes(term)
  );
}
/**
 * Gets champion image URL by champion name
 */
export function getChampionImage(championName: string): string {
  return `${CHAMPION_SQUARE_IMAGE_BASE_URL}${championName}.png`;
}

  export function getChampionImageById(championId: number | string): string {
  // Validate that championName is a string

  // The champion name might need to be converted to the correct image filename format
  // Some champions have special characters or spaces that need to be handled
  // Quiet logs in production UI
  return `${CHAMPION_IMAGE_BASE_URL_LOADING}${championId}${CHAMPION_IMAGE_BASE_URL_LOADING_SKIN}`;
}