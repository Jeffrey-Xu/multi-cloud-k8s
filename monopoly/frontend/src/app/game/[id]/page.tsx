'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import GameBoard from '@/components/GameBoard'
import PlayerPanel from '@/components/PlayerPanel'
import GameChat from '@/components/GameChat'
import DiceRoller from '@/components/DiceRoller'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string
  
  const { 
    gameState, 
    playerId, 
    playerName, 
    isConnected,
    setPlayerId 
  } = useGameStore()
  
  const { joinGame, rollDice } = useSocket()
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    if (!playerName) {
      router.push('/')
      return
    }

    const joinGameRoom = async () => {
      if (playerId) {
        joinGame(gameId, playerId)
        return
      }

      setIsJoining(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/games/${gameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName })
        })

        if (!response.ok) {
          throw new Error('Failed to join game')
        }

        const data = await response.json()
        setPlayerId(data.playerId)
        joinGame(gameId, data.playerId)
      } catch (error) {
        console.error('Failed to join game:', error)
        alert('Failed to join game. Returning to home.')
        router.push('/')
      } finally {
        setIsJoining(false)
      }
    }

    joinGameRoom()
  }, [gameId, playerName, playerId, joinGame, setPlayerId, router])

  const handleRollDice = () => {
    if (playerId && gameState) {
      rollDice(gameState.id!, playerId)
    }
  }

  const isMyTurn = gameState?.currentPlayer?.id === playerId
  const currentPlayer = gameState?.players.find(p => p.id === playerId)

  if (isJoining) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-monopoly-green mx-auto mb-4"></div>
          <p className="text-lg">Joining game...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-yellow-500 text-4xl mb-4">⚠️</div>
          <p className="text-lg">Connecting to game server...</p>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-4xl mb-4">🎲</div>
          <p className="text-lg">Loading game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">🎲 Monopoly Go</h1>
            <span className="text-sm text-gray-500">Game ID: {gameId}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Players: {gameState.players.length}/4
            </span>
            {isMyTurn && (
              <span className="bg-monopoly-green text-white px-3 py-1 rounded-full text-sm font-medium">
                Your Turn!
              </span>
            )}
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              ❌ Exit
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <GameBoard gameState={gameState} />
              
              {/* Dice Area */}
              <div className="mt-6 text-center">
                <DiceRoller 
                  onRoll={handleRollDice}
                  disabled={!isMyTurn || gameState.status !== 'active'}
                  isMyTurn={isMyTurn}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-lg mb-4">Players</h3>
              <PlayerPanel 
                players={gameState.players} 
                currentPlayerId={playerId}
                currentTurnPlayerId={gameState.currentPlayer?.id}
              />
            </div>

            {/* Game Status */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-lg mb-2">Game Status</h3>
              <div className="space-y-2 text-sm">
                <p>Status: <span className="font-medium capitalize">{gameState.status}</span></p>
                {gameState.currentPlayer && (
                  <p>Current Turn: <span className="font-medium">{gameState.currentPlayer.name}</span></p>
                )}
                {currentPlayer && (
                  <p>Your Money: <span className="font-medium text-monopoly-green">${currentPlayer.money}</span></p>
                )}
              </div>
            </div>

            {/* Chat */}
            <GameChat gameId={gameId} />
          </div>
        </div>
      </div>
    </div>
  )
}
