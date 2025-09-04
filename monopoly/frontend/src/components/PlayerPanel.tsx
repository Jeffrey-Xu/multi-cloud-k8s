import { Player } from '@/stores/gameStore'

interface PlayerPanelProps {
  players: Player[]
  currentPlayerId: string | null
  currentTurnPlayerId: string | undefined
}

const PLAYER_COLORS = [
  'bg-red-500',
  'bg-blue-500', 
  'bg-green-500',
  'bg-yellow-500'
]

export default function PlayerPanel({ players, currentPlayerId, currentTurnPlayerId }: PlayerPanelProps) {
  return (
    <div className="space-y-3">
      {players.map((player, index) => (
        <div
          key={player.id}
          className={`p-3 rounded-lg border-2 ${
            player.id === currentTurnPlayerId 
              ? 'border-monopoly-green bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          } ${
            player.id === currentPlayerId ? 'ring-2 ring-blue-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${PLAYER_COLORS[index % PLAYER_COLORS.length]}`} />
              <span className="font-medium">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </span>
              {!player.connected && (
                <span className="text-xs text-red-500">Offline</span>
              )}
            </div>
            {player.id === currentTurnPlayerId && (
              <span className="text-xs bg-monopoly-green text-white px-2 py-1 rounded">
                Turn
              </span>
            )}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Money:</span>
              <span className="font-medium text-monopoly-green">${player.money}</span>
            </div>
            <div className="flex justify-between">
              <span>Properties:</span>
              <span className="font-medium">{player.properties.length}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
