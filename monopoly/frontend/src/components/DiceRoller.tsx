interface DiceRollerProps {
  onRoll: () => void
  disabled: boolean
  isMyTurn: boolean
}

export default function DiceRoller({ onRoll, disabled, isMyTurn }: DiceRollerProps) {
  return (
    <div className="text-center">
      <div className="mb-4">
        <div className="text-4xl mb-2">🎲 🎲</div>
        {isMyTurn ? (
          <p className="text-lg font-medium text-monopoly-green">Your turn to roll!</p>
        ) : (
          <p className="text-gray-600">Waiting for other player...</p>
        )}
      </div>
      
      <button
        onClick={onRoll}
        disabled={disabled}
        className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
          disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-monopoly-green hover:bg-green-600 text-white hover:scale-105 active:scale-95'
        }`}
      >
        🎲 Roll Dice
      </button>
    </div>
  )
}
