"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChampionListItem } from '../../types/champion';
import { fetchChampionData, getChampionImage, getChampionImageById, createChampionKeyMapping, getChampionByKey } from '../../utils/championApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { config } from '../../lib/config';
import { IncomingMessage, MessageTypes, PossiblePhases, PhaseHelpers, GamePhase } from '../../types/messages';
import { StatusMessage, Status } from '../../types/messages';

// Timer component - Horizontal Progress Bar
const Timer = ({ timeRemaining, timerActive, initialTime = 60 }: { timeRemaining: number, timerActive: boolean, initialTime?: number }) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);

  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!timerActive || displayTime <= 0) return;

    const interval = setInterval(() => {
      setDisplayTime(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, displayTime]);

  // Calculate the progress percentage (0-100)
  const progressPercentage = timerActive && initialTime > 0 
    ? Math.max(0, (displayTime / initialTime) * 100)
    : 0;

  const getProgressColor = () => {
    if (displayTime <= 10) return 'bg-red-400';
    if (displayTime <= 30) return 'bg-yellow-400';
    return 'bg-gray-300';
  };

  return (
    <div className="w-full h-2 bg-gray-700 overflow-hidden">
      <div 
        className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()} ${displayTime <= 10 ? 'animate-pulse' : ''}`}
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
};

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

function StreamPageContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game_id');
  const key = searchParams.get('key');
  const [championMapping, setChampionMapping] = useState<Record<string, ChampionListItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameRoom, setGameRoom] = useState<StatusMessage | null>(null);
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

  useEffect(() => {
    async function loadChampions() {
      try {
        setLoading(true);
        setError(null);
        
        const championData = await fetchChampionData();
        const mapping = createChampionKeyMapping(championData);
        
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

  useEffect(() => {
    if (gameId) {
      sendMessage({
        type: MessageTypes.JOIN,
        room_id: gameId,
      });
    }
  }, [gameId, sendMessage]);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-center bg-black/80 p-8 rounded-lg border border-gray-600">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Champions</h2>
          <p className="text-gray-400">Fetching champion data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-center bg-black/80 p-8 rounded-lg border border-red-600">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Champions</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-transparent text-white overflow-hidden relative">
      {/* Fearless Bans Row - Above everything */}
      {gameRoom?.fearless_bans && gameRoom.fearless_bans.length > 0 && (
        <div className="absolute bottom-72 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex gap-2 justify-center">
            {gameRoom.fearless_bans.map((bannedChampion, index) => (
              <div
                key={`fearless-ban-${index}`}
                className="relative w-12 h-12 rounded overflow-hidden border border-gray-600 bg-gray-800"
              >
                {bannedChampion && bannedChampion !== "-1" ? (
                  <img
                    src={(() => {
                      const champion = getChampionByKey(bannedChampion, championMapping);
                      return champion ? getChampionImage(champion.id) : `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                    })()}
                    alt={`Fearless Ban ${getChampionByKey(bannedChampion, championMapping)?.name || bannedChampion}`}
                    className="w-full h-full object-cover opacity-60"
                    onError={(e) => {
                      e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/15.18.1/img/champion/Annie.png`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    ?
                  </div>
                )}
                {/* Red X overlay to indicate ban */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-500 text-xl font-bold drop-shadow-lg">✕</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Bottom Horizontal Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 px-8 py-6">
        {/* Timer Bar - At the top edge of the frame */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <Timer 
            timeRemaining={gameRoom?.time_remaining || 0} 
            timerActive={gameRoom?.timer_active || false}
            initialTime={gameRoom?.time_per_pick || 60}
          />
        </div>
        <div className="flex items-center justify-between max-w-screen-xl mx-auto pb-8">
          
          {/* Blue Team - Left Side */}
          <div className="flex items-end gap-6">

            
            {/* Picks and Bans Layout */}
            <div className="flex items-center gap-5">
              <div className="flex flex-col gap-2"> </div>
              {/* Bans - Vertical stack on left */}

              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((banSlot) => {
                  const banIndex = banSlot - 1;
                  const bannedChampion = gameRoom?.blue_team.bans?.[banIndex];
                  const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'blue', 'ban', banIndex);
                  return (
                    <div
                      key={`blue-ban-${banSlot}`}
                      className={`relative w-8 h-8 rounded overflow-hidden border-1 ${shouldPulsate ? 'border-blue-400 shadow-lg shadow-blue-400/50 animate-pulse' : 'border-gray-600'} bg-gray-800`}
                    >
                      {bannedChampion && bannedChampion !== "-1" ? (
                        <>
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

                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                          {banSlot}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Picks - Large, center */}
              <div className="flex gap-3">
                {[1, 2, 3].map((pickSlot) => {
                  const pickIndex = pickSlot - 1;
                  const pickedChampion = gameRoom?.blue_team.picks?.[pickIndex];
                  const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'blue', 'pick', pickIndex);
                  return (
                    <div
                      key={`blue-pick-${pickSlot}`}
                      className={`relative w-32 h-48 overflow-hidden border-1 ${shouldPulsate ? 'border-blue-400 shadow-lg shadow-blue-400/50 animate-pulse' : 'border-gray-600'} bg-gray-800`}
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
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                          {pickSlot}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* W2A Logo - Center */}
          <div className="flex-shrink-0 px-8 flex flex-col items-center">
            {/* Logo space - can add W2A logo here if needed */}
            <img src="/W2A Logo blanco sin fondo.svg" alt="W2A" className="h-32 w-auto" />
          </div>

          {/* Red Team - Right Side */}
          <div className="flex items-end gap-6">
            {/* Picks and Bans Layout */}
            <div className="flex items-center gap-3">
              {/* Picks - Large, center */}
              <div className="flex gap-3">
                {[1, 2, 3].map((pickSlot) => {
                  const pickIndex = pickSlot - 1;
                  const pickedChampion = gameRoom?.red_team.picks?.[pickIndex];
                  const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'red', 'pick', pickIndex);
                  return (
                    <div
                      key={`red-pick-${pickSlot}`}
                      className={`relative w-32 h-48 overflow-hidden border-1 ${shouldPulsate ? 'border-red-400 shadow-lg shadow-red-400/50 animate-pulse' : 'border-gray-600'} bg-gray-800`}
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
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                          {pickSlot}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Bans - Vertical stack on right */}
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((banSlot) => {
                  const banIndex = banSlot - 1;
                  const bannedChampion = gameRoom?.red_team.bans?.[banIndex];
                  const shouldPulsate = shouldSlotPulsate(gameRoom?.current_phase || PossiblePhases.NO_READY, 'red', 'ban', banIndex);
                  return (
                    <div
                      key={`red-ban-${banSlot}`}
                      className={`relative w-8 h-8 rounded overflow-hidden border-1 ${shouldPulsate ? 'border-red-400 shadow-lg shadow-red-400/50 animate-pulse' : 'border-gray-600'} bg-gray-800`}
                    >
                      {bannedChampion && bannedChampion !== "-1" ? (
                        <>
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

                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                          {banSlot}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2"> </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StreamPage() {
  useEffect(() => {
    // Store original background
    const originalBackground = document.body.style.background;
    
    // Set transparent background for stream page
    document.body.style.background = 'transparent';
    
    // Restore original background when component unmounts
    return () => {
      document.body.style.background = originalBackground;
    };
  }, []);

  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-center bg-black/80 p-8 rounded-lg border border-gray-600">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Draft</h2>
          <p className="text-gray-400">Preparing champion draft...</p>
        </div>
      </div>
    }>
      <StreamPageContent />
    </Suspense>
  );
}