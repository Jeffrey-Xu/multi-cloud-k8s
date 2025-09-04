import { GameState } from '@/stores/gameStore'

interface GameBoardProps {
  gameState: GameState
}

const BOARD_SPACES = [
  { id: 0, name: 'GO', type: 'special', color: 'bg-red-500' },
  { id: 1, name: 'Mediterranean Ave', type: 'property', color: 'bg-amber-800' },
  { id: 2, name: 'Community Chest', type: 'card', color: 'bg-blue-200' },
  { id: 3, name: 'Baltic Ave', type: 'property', color: 'bg-amber-800' },
  { id: 4, name: 'Income Tax', type: 'tax', color: 'bg-gray-300' },
  { id: 5, name: 'Reading Railroad', type: 'railroad', color: 'bg-black' },
  { id: 6, name: 'Oriental Ave', type: 'property', color: 'bg-sky-300' },
  { id: 7, name: 'Chance', type: 'card', color: 'bg-orange-200' },
  { id: 8, name: 'Vermont Ave', type: 'property', color: 'bg-sky-300' },
  { id: 9, name: 'Connecticut Ave', type: 'property', color: 'bg-sky-300' },
  { id: 10, name: 'Jail', type: 'special', color: 'bg-orange-500' },
  { id: 11, name: 'St. Charles Place', type: 'property', color: 'bg-pink-400' },
  { id: 12, name: 'Electric Company', type: 'utility', color: 'bg-yellow-200' },
  { id: 13, name: 'States Ave', type: 'property', color: 'bg-pink-400' },
  { id: 14, name: 'Virginia Ave', type: 'property', color: 'bg-pink-400' },
  { id: 15, name: 'Pennsylvania RR', type: 'railroad', color: 'bg-black' },
  { id: 16, name: 'St. James Place', type: 'property', color: 'bg-orange-400' },
  { id: 17, name: 'Community Chest', type: 'card', color: 'bg-blue-200' },
  { id: 18, name: 'Tennessee Ave', type: 'property', color: 'bg-orange-400' },
  { id: 19, name: 'New York Ave', type: 'property', color: 'bg-orange-400' },
  { id: 20, name: 'Free Parking', type: 'special', color: 'bg-red-500' },
  { id: 21, name: 'Kentucky Ave', type: 'property', color: 'bg-red-400' },
  { id: 22, name: 'Chance', type: 'card', color: 'bg-orange-200' },
  { id: 23, name: 'Indiana Ave', type: 'property', color: 'bg-red-400' },
  { id: 24, name: 'Illinois Ave', type: 'property', color: 'bg-red-400' },
  { id: 25, name: 'B&O Railroad', type: 'railroad', color: 'bg-black' },
  { id: 26, name: 'Atlantic Ave', type: 'property', color: 'bg-yellow-400' },
  { id: 27, name: 'Ventnor Ave', type: 'property', color: 'bg-yellow-400' },
  { id: 28, name: 'Water Works', type: 'utility', color: 'bg-yellow-200' },
  { id: 29, name: 'Marvin Gardens', type: 'property', color: 'bg-yellow-400' },
  { id: 30, name: 'Go To Jail', type: 'special', color: 'bg-orange-500' },
  { id: 31, name: 'Pacific Ave', type: 'property', color: 'bg-green-400' },
  { id: 32, name: 'North Carolina Ave', type: 'property', color: 'bg-green-400' },
  { id: 33, name: 'Community Chest', type: 'card', color: 'bg-blue-200' },
  { id: 34, name: 'Pennsylvania Ave', type: 'property', color: 'bg-green-400' },
  { id: 35, name: 'Short Line RR', type: 'railroad', color: 'bg-black' },
  { id: 36, name: 'Chance', type: 'card', color: 'bg-orange-200' },
  { id: 37, name: 'Park Place', type: 'property', color: 'bg-blue-600' },
  { id: 38, name: 'Luxury Tax', type: 'tax', color: 'bg-gray-300' },
  { id: 39, name: 'Boardwalk', type: 'property', color: 'bg-blue-600' },
]

const PLAYER_COLORS = [
  'bg-red-500',
  'bg-blue-500', 
  'bg-green-500',
  'bg-yellow-500'
]

export default function GameBoard({ gameState }: GameBoardProps) {
  const getPlayersAtPosition = (position: number) => {
    return gameState.players.filter(player => player.position === position)
  }

  const renderSpace = (space: typeof BOARD_SPACES[0], index: number) => {
    const playersHere = getPlayersAtPosition(space.id)
    
    return (
      <div
        key={space.id}
        className={`board-space ${space.color} relative min-h-[80px] p-1`}
        title={space.name}
      >
        <div className="text-center">
          <div className="text-xs font-bold truncate">{space.name}</div>
          <div className="text-xs opacity-75">{space.type}</div>
        </div>
        
        {/* Player pieces */}
        {playersHere.length > 0 && (
          <div className="absolute bottom-1 left-1 flex flex-wrap gap-1">
            {playersHere.map((player, playerIndex) => (
              <div
                key={player.id}
                className={`player-piece ${PLAYER_COLORS[gameState.players.indexOf(player) % PLAYER_COLORS.length]} w-4 h-4`}
                title={player.name}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-11 gap-1 bg-gray-800 p-2 rounded-lg">
        {/* Top row */}
        {BOARD_SPACES.slice(20, 31).map((space, index) => renderSpace(space, index))}
        
        {/* Left column */}
        <div className="col-span-1 grid grid-rows-9 gap-1">
          {BOARD_SPACES.slice(11, 20).reverse().map((space, index) => renderSpace(space, index))}
        </div>
        
        {/* Center area */}
        <div className="col-span-9 bg-monopoly-green rounded flex items-center justify-center min-h-[400px]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🎲</div>
            <h2 className="text-3xl font-bold mb-2">MONOPOLY</h2>
            <p className="text-lg">Game in Progress</p>
            <div className="mt-4 text-sm">
              <p>Players: {gameState.players.length}/4</p>
              <p>Status: {gameState.status}</p>
            </div>
          </div>
        </div>
        
        {/* Right column */}
        <div className="col-span-1 grid grid-rows-9 gap-1">
          {BOARD_SPACES.slice(31, 40).map((space, index) => renderSpace(space, index))}
        </div>
        
        {/* Bottom row */}
        {BOARD_SPACES.slice(0, 11).reverse().map((space, index) => renderSpace(space, index))}
      </div>
    </div>
  )
}
