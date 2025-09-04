'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'

export default function HomePage() {
  const [playerName, setPlayerName] = useState('')
  const [gameId, setGameId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { setPlayerName: setStoreName } = useGameStore()

  const createGame = async () => {
    if (!playerName.trim()) return

    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setStoreName(playerName)
      router.push(`/game/${data.gameId}`)
    } catch (error) {
      console.error('Failed to create game:', error)
      alert('Failed to create game. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const joinGame = () => {
    if (!playerName.trim() || !gameId.trim()) return
    
    setStoreName(playerName)
    router.push(`/game/${gameId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-monopoly-green to-monopoly-blue flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎲 Monopoly Go
          </h1>
          <p className="text-gray-600">
            Play Monopoly online with friends!
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-monopoly-green"
              maxLength={20}
            />
          </div>

          <button
            onClick={createGame}
            disabled={!playerName.trim() || isLoading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : '🎮 Create New Game'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game ID
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter game ID to join"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-monopoly-green"
            />
          </div>

          <button
            onClick={joinGame}
            disabled={!playerName.trim() || !gameId.trim()}
            className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚪 Join Existing Game
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Real-time multiplayer • Up to 4 players</p>
        </div>
      </div>
    </div>
  )
}
