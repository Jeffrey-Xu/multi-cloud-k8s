import { useState } from 'react'

interface GameChatProps {
  gameId: string
}

export default function GameChat({ gameId }: GameChatProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{id: string, player: string, text: string, timestamp: Date}>>([])

  const sendMessage = () => {
    if (!message.trim()) return
    
    // For MVP, just add to local state
    // In Phase 2, we'll integrate with WebSocket
    const newMessage = {
      id: Date.now().toString(),
      player: 'You',
      text: message,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, newMessage])
    setMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="font-bold text-lg mb-4">Game Chat</h3>
      
      {/* Messages */}
      <div className="h-48 overflow-y-auto mb-4 border rounded p-2 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No messages yet. Say hello! 👋
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-medium text-monopoly-green">{msg.player}:</span>
                <span className="ml-2">{msg.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-monopoly-green text-sm"
          maxLength={100}
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim()}
          className="px-3 py-2 bg-monopoly-green text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Send
        </button>
      </div>
    </div>
  )
}
