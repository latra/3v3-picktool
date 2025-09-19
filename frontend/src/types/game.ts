// Game Room Models
// These types match the Go server models for game room management

import { PossiblePhases } from './messages';

// Champion model for game room (different from the API Champion)
export interface GameChampion {
  name: string;
  locked_at?: number; // Optional timestamp when champion was locked
}

// Client model for connected users
export interface GameClient {
  team: "blue" | "red" | ""; // Empty string for spectator
}

// Team model for game room
export interface GameTeam {
  name: string;
  bans: GameChampion[];
  picks: GameChampion[];
}

// Main Room model that represents the complete game state
export interface GameRoom {
  id: string;
  blue_team_name: string;
  red_team_name: string;
  time_per_pick: number;
  time_per_ban: number;
  current_phase: typeof PossiblePhases[keyof typeof PossiblePhases];
  blue_team: GameTeam;
  red_team: GameTeam;
  
  // Timer fields
  time_remaining: number; // Remaining time in seconds
  timer_active: boolean; // Whether the timer is active
}

