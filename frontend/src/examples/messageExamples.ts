// Example usage of WebSocket message types
// This file demonstrates how to create and handle messages

import { 
  CreateMessage, 
  JoinMessage, 
  ActionMessage, 
  MessageTypes 
} from "../types/messages";

// Example: Creating a draft room
export const createDraftExample: CreateMessage = {
  type: MessageTypes.CREATE,
  blue_team_name: "Team Liquid",
  red_team_name: "G2 Esports", 
  blue_team_has_bans: true,
  red_team_has_bans: true,
  time_per_pick: 30,
  time_per_ban: 15
};

// Example: Joining a room as blue team
export const joinAsBlueTeamExample: JoinMessage = {
  type: MessageTypes.JOIN,
  room_id: "room_123456",
  key: "blue_team_key_abc"
};

// Example: Joining as spectator
export const joinAsSpectatorExample: JoinMessage = {
  type: MessageTypes.JOIN,
  room_id: "room_123456"
  // No key provided = spectator
};

// Example: Player ready action
export const playerReadyExample: ActionMessage = {
  type: MessageTypes.ACTION,
  action: "ready"
};

// Example: Champion pick action
export const championPickExample: ActionMessage = {
  type: MessageTypes.ACTION,
  action: "champ_pick",
  champion: "Jinx"
};

// Example: Champion select action (for bans)
export const championBanExample: ActionMessage = {
  type: MessageTypes.ACTION,
  action: "champ_select",
  champion: "Yasuo"
};

// Helper function to send messages with proper typing
export const sendTypedMessage = <T>(sendMessage: (msg: T) => boolean, message: T): boolean => {
  return sendMessage(message);
};
