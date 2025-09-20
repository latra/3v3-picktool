"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChampionListItem } from '../../types/champion';
import { fetchChampionData, formatChampionList, filterChampions, getChampionImage, getChampionImageById, createChampionKeyMapping, getChampionByKey } from '../../utils/championApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { config } from '../../lib/config';
import { IncomingMessage, MessageTypes, PossiblePhases, PhaseHelpers, GamePhase } from '../../types/messages';
import { StatusMessage, Status } from '../../types/messages';

// Helper functions to determine which slot should pulsate
const getNextSlotInfo = (phase: GamePhase): { team: 'blue' | 'red' | null, type: 'ban' | 'pick' | null, slotIndex: number } => {
  switch (phase) {
    case PossiblePhases.BAN_BLUE_1:
      return { team: 'blue', type: 'ban', slotIndex: 0 };
    case PossiblePhases.BAN_RED_1:
      return { team: 'red', type: 'ban', slotIndex: 0 };
    case PossiblePhases.BAN_BLUE_2:
      return { team: 'blue', type: 'ban', slotIndex: 1 };
    case PossiblePhases.BAN_RED_2:
      return { team: 'red', type: 'ban', slotIndex: 1 };
    case PossiblePhases.BAN_BLUE_3:
      return { team: 'blue', type: 'ban', slotIndex: 2 };
    case PossiblePhases.BAN_RED_3:
      return { team: 'red', type: 'ban', slotIndex: 2 };
    case PossiblePhases.PICK_BLUE_1:
      return { team: 'blue', type: 'pick', slotIndex: 0 };
    case PossiblePhases.PICK_RED_1:
      return { team: 'red', type: 'pick', slotIndex: 0 };
    case PossiblePhases.PICK_RED_2:
      return { team: 'red', type: 'pick', slotIndex: 1 };
    case PossiblePhases.PICK_BLUE_2:
      return { team: 'blue', type: 'pick', slotIndex: 1 };
    case PossiblePhases.BAN_RED_4:
      return { team: 'red', type: 'ban', slotIndex: 3 };
    case PossiblePhases.BAN_BLUE_4:
      return { team: 'blue', type: 'ban', slotIndex: 3 };
    case PossiblePhases.BAN_RED_5:
      return { team: 'red', type: 'ban', slotIndex: 4 };
    case PossiblePhases.BAN_BLUE_5:
      return { team: 'blue', type: 'ban', slotIndex: 4 };
    case PossiblePhases.PICK_BLUE_3:
      return { team: 'blue', type: 'pick', slotIndex: 2 };
    case PossiblePhases.PICK_RED_3:
      return { team: 'red', type: 'pick', slotIndex: 2 };
    default:
      return { team: null, type: null, slotIndex: -1 };
  }
};

const shouldSlotPulsate = (phase: GamePhase, team: 'blue' | 'red', type: 'ban' | 'pick', slotIndex: number): boolean => {
  const nextSlot = getNextSlotInfo(phase);
  return nextSlot.team === team && nextSlot.type === type && nextSlot.slotIndex === slotIndex;
};

// Helper function to check if a champion is banned or picked
const isChampionDisabled = (championKey: number, gameRoom: StatusMessage | null): boolean => {
  if (!gameRoom) return false;
  
  // Convert championKey to string for comparison
  const championKeyStr = championKey.toString();
  
  // Check all bans from both teams
  const allBans = [
    ...(gameRoom.blue_team.bans || []),
    ...(gameRoom.red_team.bans || [])
  ].filter(ban => ban && ban !== "-1");
  
  // Check all picks from both teams
  const allPicks = [
    ...(gameRoom.blue_team.picks || []),
    ...(gameRoom.red_team.picks || [])
  ].filter(pick => pick && pick !== "-1");
  
  // Return true if champion is in either bans or picks
  return allBans.includes(championKeyStr) || allPicks.includes(championKeyStr);
};
function DraftPageContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game_id');
  const key = searchParams.get('key');
  const team = searchParams.get('team');
  const [champions, setChampions] = useState<ChampionListItem[]>([]);
  const [filteredChampions, setFilteredChampions] = useState<ChampionListItem[]>([]);
  const [championMapping, setChampionMapping] = useState<Record<string, ChampionListItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [groupedChampions, setGroupedChampions] = useState<Record<string, ChampionListItem[]>>({});
  const [status, setStatus] = useState<typeof Status[keyof typeof Status]>(Status.NOT_READY);
  const [gameRoom, setGameRoom] = useState<StatusMessage | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedChampion, setSelectedChampion] = useState<ChampionListItem | null>(null);
  const { connectionStatus, sendMessage } = useWebSocket(config.websocketUrl, {
    onMessage: (event) => {
      try {
        const message: IncomingMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Handle different message types
        switch (message.type) {
          case MessageTypes.CREATE_RESPONSE:
            console.error('Create response message received here. This should not happen.');
            break;
          case MessageTypes.STATUS:
            console.log('Status update:', message);
            const statusMsg = message as StatusMessage;
            setGameRoom(statusMsg);
            
            break;
          default:
            console.log('Unknown message type:', message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
    onOpen: (event) => {
      console.log('WebSocket connected');
    },
    onClose: (event) => {
      console.log('WebSocket disconnected');
    },
    onError: (event) => {
      console.error('WebSocket error:', event);
    }
  });

  const handleClick = () => {
    if (PhaseHelpers.isNotReadyPhase(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red')) {
      sendMessage({
        type: MessageTypes.ACTION,
        action: "ready"
      });
    }

    if (PhaseHelpers.isPickPhase(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red') || PhaseHelpers.isBanPhase(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red')) {
      sendMessage({
        type: MessageTypes.ACTION,
        action: "champ_pick",
        champion: selectedChampion?.key.toString()
      });
    }
  };

  useEffect(() => {
    async function loadChampions() {
      try {
        setLoading(true);
        setError(null);
        
        const championData = await fetchChampionData();
        const championList = formatChampionList(championData);
        const mapping = createChampionKeyMapping(championData);
        
        setChampions(championList);
        setFilteredChampions(championList);
        setChampionMapping(mapping);
      } catch (err) {
        console.error('Failed to load champions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load champion data');
      } finally {
        setLoading(false);

      }
    }

    loadChampions();
  }, []);

  // Separate effect for WebSocket join message
  useEffect(() => {
    // Only send join message if we have the required parameters
    if (gameId && key) {
      sendMessage({
        type: MessageTypes.JOIN,
        room_id: gameId,
        key: key,
        team: 1 // Default team, you might want to make this dynamic
      });
    }
  }, [gameId, key, sendMessage]);

  useEffect(() => {
    let filtered = champions;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filterChampions(filtered, searchTerm);
    }
    
    setFilteredChampions(filtered);
  }, [champions, searchTerm, selectedRole]);

  const roles = ['All', ...Object.keys(groupedChampions).sort()];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-white mb-2">Loading Champions</h2>
          <p className="text-gray-400">Fetching champion data from Riot Games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Error Loading Champions</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-32">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src="/W2A Logo blanco sin fondo.svg" alt="W2A" className="h-8 opacity-95" />
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0080ff] to-[#ff7430]">Champion Draft</h1>
          {gameRoom?.current_phase && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[var(--w2a-text)]">
              Phase: {gameRoom.current_phase}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search champions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
            />
            <div className="absolute right-3 top-2.5 text-gray-400">🔍</div>
          </div>

        </div>

        {/* Main Draft Layout */}
        <div className="flex gap-6 h-[600px]">
          {/* Left Team (Team 1) */}
          <div className="w-64 w2a-card p-4 border border-blue-500/30 bg-gradient-to-b from-[#0080ff]/10 to-transparent">
            <h3 className="text-lg font-semibold text-blue-300 mb-4 text-center">{gameRoom?.blue_team.name}</h3>
            <div className="space-y-2">
              {/* Initial Bans (3) */}
              <div>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3].map((banSlot) => {
                    const banIndex = banSlot - 1;
                    const bannedChampion = gameRoom?.blue_team.bans?.[banIndex];
                    const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'blue', 'ban', banIndex);
                    return (
                      <div
                        key={`team1-ban-${banSlot}`}
                        className={`w-8 h-8 bg-[#1a243a] rounded border border-blue-500/30 flex items-center justify-center overflow-hidden ${shouldPulsate ? 'pulsate-blue' : ''}`}
                      >
                        {bannedChampion && bannedChampion !== "-1" ? (
                          <img
                            src={(() => {
                              const champion = getChampionByKey(bannedChampion, championMapping);
                              return champion ? getChampionImage(champion.id) : `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            })()}
                            alt={`Banned ${getChampionByKey(bannedChampion, championMapping)?.name || bannedChampion}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            }}
                          />
                        ) : (
                          <span className="text-red-400 text-xs">{banSlot}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* First Two Picks */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-blue-300 text-center">First Pick</h4>
                {[1, 2].map((pickSlot) => {
                  const pickIndex = pickSlot - 1;
                  const pickedChampion = gameRoom?.blue_team.picks?.[pickIndex];
                  const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'blue', 'pick', pickIndex);
                  return (
                    <div
                      key={`team1-pick-${pickSlot}`}
                      className={`h-20 bg-[#0f162b]/60 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden ${shouldPulsate ? 'pulsate-blue' : ''}`}
                    >
                      {pickedChampion && pickedChampion !== "-1" ? (
                        <img
                          src={getChampionImageById(pickedChampion)}
                          alt={`Picked ${pickedChampion}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                          }}
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">Pick {pickSlot}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Final Bans (2) */}
              <div>
                <div className="flex gap-1 justify-center">
                  {[4, 5].map((banSlot) => {
                    const banIndex = banSlot - 1;
                    const bannedChampion = gameRoom?.blue_team.bans?.[banIndex];
                    const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'blue', 'ban', banIndex);
                    return (
                      <div
                        key={`team1-ban-${banSlot}`}
                        className={`w-8 h-8 bg-[#1a243a] rounded border border-blue-500/30 flex items-center justify-center overflow-hidden ${shouldPulsate ? 'pulsate-blue' : ''}`}
                      >
                        {bannedChampion && bannedChampion !== "-1" ? (
                          <img
                            src={(() => {
                              const champion = getChampionByKey(bannedChampion, championMapping);
                              return champion ? getChampionImage(champion.id) : `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            })()}
                            alt={`Banned ${getChampionByKey(bannedChampion, championMapping)?.name || bannedChampion}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            }}
                          />
                        ) : (
                          <span className="text-red-400 text-xs">{banSlot}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Pick */}
              <div className="space-y-1">
                <div className={`h-20 bg-[#0f162b]/60 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden ${shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'blue', 'pick', 2) ? 'pulsate-blue' : ''}`}>
                  {gameRoom?.blue_team.picks?.[2] && gameRoom?.blue_team.picks?.[2] !== "-1" ? (
                    <img
                      src={getChampionImageById(gameRoom.blue_team.picks[2])}
                      alt={`Picked ${gameRoom.blue_team.picks[2]}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                      }}
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">Pick 3</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Champion Grid Container */}
          <div className="flex-1 overflow-y-auto w2a-card p-4 relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-1 pb-16">
              {filteredChampions.map(champion => {
                const isDisabled = isChampionDisabled(champion.key, gameRoom);
                return (
                  <div
                    key={champion.id}
                    className={`rounded-lg p-1 transition-all group border ${
                      isDisabled 
                        ? 'bg-[#0f162b]/60 border-white/5 cursor-not-allowed opacity-50' 
                        : 'bg-[#0f162b]/80 border-white/5 hover:border-white/15 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] cursor-pointer'
                    } ${selectedChampion?.id === champion.id ? 'ring-2 ring-[#0080ff]/60' : ''}`}
                    onClick={() => {
                      if (isDisabled) return; // Prevent action if disabled
                      sendMessage({
                        type: MessageTypes.ACTION,
                        action: "champ_select",
                        champion: champion.key.toString()
                      });
                      console.log('Selected champion:', champion.name);
                      setSelectedChampion(champion);
                    }}
                  >
                      <img
                        src={getChampionImage(champion.id)}
                        alt={champion.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isDisabled 
                            ? 'grayscale' 
                            : 'group-hover:scale-110'
                        }`}
                        onError={(e) => {
                          e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                        }}
                      />
                  </div>
                );
              })}
            </div>

            {filteredChampions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Champions Found</h3>
              </div>
            )}

            {/* Centered Button at Bottom */}
            <div className="fixed bottom-15 left-1/2 -translate-x-1/2 w-96 bg-gradient-to-t to-transparent p-4 pt-8 z-50">
              <button
                className="w-full py-3 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#0080ff] to-[#ff7430] hover:brightness-110 hover:shadow-[0_0_25px_rgba(0,128,255,0.25)]"
                onClick={() => {
                  console.log('Action button clicked');
                  handleClick();
                }}
                disabled={PhaseHelpers.notTurn(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red') || gameRoom?.current_phase === PossiblePhases.FINISHED}
              >
                {PhaseHelpers.isNotReadyPhase(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red') 
                  ? 'Ready'
                  : PhaseHelpers.isBanPhase(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red')
                    ? 'Ban Champion'
                    : PhaseHelpers.isPickPhase(gameRoom?.current_phase || PossiblePhases.NO_READY, team as 'blue' | 'red')
                      ? 'Pick Champion'
                      : gameRoom?.current_phase === PossiblePhases.FINISHED
                        ? 'Finished'
                      : 'Waiting...'
                }
              </button>
            </div>
        </div>


          {/* Right Team (Team 2) */}
          <div className="w-64 w2a-card p-4 border border-red-500/30 bg-gradient-to-b from-[#ff7430]/10 to-transparent">
            <h3 className="text-lg font-semibold text-red-300 mb-4 text-center">{gameRoom?.red_team.name}</h3>
            <div className="space-y-2">
              {/* Initial Bans (3) */}
              <div>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3].map((banSlot) => {
                    const banIndex = banSlot - 1;
                    const bannedChampion = gameRoom?.red_team.bans?.[banIndex];
                    const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'red', 'ban', banIndex);
                    return (
                      <div
                        key={`team2-ban-${banSlot}`}
                        className={`w-8 h-8 bg-[#1a243a] rounded border border-red-500/30 flex items-center justify-center overflow-hidden ${shouldPulsate ? 'pulsate-red' : ''}`}
                      >
                        {bannedChampion && bannedChampion !== "-1" ? (
                          <img
                            src={(() => {
                              const champion = getChampionByKey(bannedChampion, championMapping);
                              return champion ? getChampionImage(champion.id) : `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            })()}
                            alt={`Banned ${getChampionByKey(bannedChampion, championMapping)?.name || bannedChampion}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            }}
                          />
                        ) : (
                          <span className="text-red-400 text-xs">{banSlot}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* First Two Picks */}
              <div className="space-y-1">
                {[1, 2].map((pickSlot) => {
                  const pickIndex = pickSlot - 1;
                  const pickedChampion = gameRoom?.red_team.picks?.[pickIndex];
                  const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'red', 'pick', pickIndex);
                  return (
                    <div
                      key={`team2-pick-${pickSlot}`}
                      className={`h-20 bg-[#0f162b]/60 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden ${shouldPulsate ? 'pulsate-red' : ''}`}
                    >
                      {pickedChampion && pickedChampion !== "-1" ? (
                        <img
                          src={getChampionImageById( pickedChampion)}
                          alt={`Picked ${pickedChampion}`}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                          }}
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">Pick {pickSlot}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Final Bans (2) */}
              <div>
                <div className="flex gap-1 justify-center">
                  {[4, 5].map((banSlot) => {
                    const banIndex = banSlot - 1;
                    const bannedChampion = gameRoom?.red_team.bans?.[banIndex];
                    const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'red', 'ban', banIndex);
                    return (
                      <div
                        key={`team2-ban-${banSlot}`}
                        className={`w-8 h-8 bg-[#1a243a] rounded border border-red-500/30 flex items-center justify-center overflow-hidden ${shouldPulsate ? 'pulsate-red' : ''}`}
                      >
                        {bannedChampion && bannedChampion !== "-1" ? (
                          <img
                            src={(() => {
                              const champion = getChampionByKey(bannedChampion, championMapping);
                              return champion ? getChampionImage(champion.id) : `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            })()}
                            alt={`Banned ${getChampionByKey(bannedChampion, championMapping)?.name || bannedChampion}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                            }}
                          />
                        ) : (
                          <span className="text-red-400 text-xs">{banSlot}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Pick */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-red-300 text-center">Last Pick</h4>
                <div className={`h-20 bg-[#0f162b]/60 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden ${shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'red', 'pick', 2) ? 'pulsate-red' : ''}`}>
                  {gameRoom?.red_team.picks?.[2] && gameRoom?.red_team.picks?.[2] !== "-1" ? (
                    <img
                      src={getChampionImageById(gameRoom.red_team.picks[2])}
                      alt={`Picked ${gameRoom.red_team.picks[2]}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                      }}
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">Pick 3</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 pt-4 pb-2 bg-gray-900/95 backdrop-blur-sm border-t border-gray-600/30 text-center text-gray-400 text-sm">
        <p>
          Developed by <span className="text-white font-medium">Latra</span> for{" "}
          <span className="text-white font-medium">W2A</span> |{" "}
          <a 
            href="https://github.com/latra/3v3-picktool" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline hover:no-underline"
          >
            GitHub Repository
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function DraftPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-white mb-2">Loading Draft</h2>
          <p className="text-gray-400">Preparing champion draft...</p>
        </div>
      </div>
    }>
      <DraftPageContent />
    </Suspense>
  );
}