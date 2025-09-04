import { create } from 'zustand'

export interface Player {
  id: string
  name: string
  position: number
  money: number
  properties: string[]
  connected: boolean
}

export interface GameState {
  id: string | null
  players: Player[]
  currentPlayer: Player | null
  status: 'waiting' | 'active' | 'finished'
  board: any[]
}

interface GameStore {
  // State
  gameState: GameState | null
  playerId: string | null
  playerName: string
  isConnected: boolean
  
  // Actions
  setGameState: (state: GameState) => void
  setPlayerId: (id: string) => void
  setPlayerName: (name: string) => void
  setConnected: (connected: boolean) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: null,
  playerId: null,
  playerName: '',
  isConnected: false,
  
  // Actions
  setGameState: (state) => set({ gameState: state }),
  
  setPlayerId: (id) => set({ playerId: id }),
  
  setPlayerName: (name) => set({ playerName: name }),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  updatePlayer: (playerId, updates) => set((state) => {
    if (!state.gameState) return state
    
    const updatedPlayers = state.gameState.players.map(player =>
      player.id === playerId ? { ...player, ...updates } : player
    )
    
    return {
      gameState: {
        ...state.gameState,
        players: updatedPlayers
      }
    }
  }),
  
  reset: () => set({
    gameState: null,
    playerId: null,
    playerName: '',
    isConnected: false
  })
}))
