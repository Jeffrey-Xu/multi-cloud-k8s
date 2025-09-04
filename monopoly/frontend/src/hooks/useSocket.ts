import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '@/stores/gameStore'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { setGameState, setConnected, playerId } = useGameStore()

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to game server')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from game server')
      setConnected(false)
    })

    // Game events
    socket.on('gameState', (gameState) => {
      console.log('Received game state:', gameState)
      setGameState(gameState)
    })

    socket.on('gameUpdate', (update) => {
      console.log('Game update:', update)
      if (update.gameState) {
        setGameState(update.gameState)
      }
    })

    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data)
      if (data.gameState) {
        setGameState(data.gameState)
      }
    })

    socket.on('playerDisconnected', (data) => {
      console.log('Player disconnected:', data)
    })

    return () => {
      socket.disconnect()
    }
  }, [setGameState, setConnected])

  const joinGame = (gameId: string, playerId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinGame', { gameId, playerId })
    }
  }

  const rollDice = (gameId: string, playerId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('rollDice', { gameId, playerId })
    }
  }

  return {
    socket: socketRef.current,
    joinGame,
    rollDice
  }
}
