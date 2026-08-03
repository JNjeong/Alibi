import { useCallback, useEffect, useRef, useState } from "react"

import { getRoomSocket } from "../api/socket"

export const useRoomSocket = (roomId) => {
  const socketRef = useRef(null)

  const [connected, setConnected] = useState(false)
  const [roomState, setRoomState] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [socketError, setSocketError] = useState("")

  const getEmitSocket = useCallback(() => {
    const socket = socketRef.current || getRoomSocket()
    socketRef.current = socket

    if (!socket.connected) {
      socket.connect()
    }

    return socket
  }, [])

  const connect = useCallback(() => {
    if (!roomId) {
      return null
    }

    return getEmitSocket()
  }, [getEmitSocket, roomId])

  useEffect(() => {
    const socket = connect()

    if (!socket) {
      return undefined
    }

    const handleConnect = () => {
      setConnected(true)
      setSocketError("")
      socket.emit("room:join", { roomId })
    }

    const handleDisconnect = () => {
      setConnected(false)
    }

    const handleJoined = ({ room, chatMessages: initialMessages = [] }) => {
      setRoomState(room)
      setChatMessages(initialMessages)
    }

    const handleParticipantsUpdated = (payload) => {
      setRoomState(payload)
    }

    const handleChat = ({ message }) => {
      setChatMessages((previous) => {
        const alreadyExists = previous.some(
          (item) => String(item.id) === String(message.id)
        )

        if (alreadyExists) {
          return previous
        }

        return [...previous, message]
      })
    }

    const handleError = ({ message }) => {
      setSocketError(message || "소켓 오류가 발생했습니다.")
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("room:joined", handleJoined)
    socket.on("room:participantsUpdated", handleParticipantsUpdated)
    socket.on("room:chat", handleChat)
    socket.on("room:error", handleError)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("room:joined", handleJoined)
      socket.off("room:participantsUpdated", handleParticipantsUpdated)
      socket.off("room:chat", handleChat)
      socket.off("room:error", handleError)
    }
  }, [connect, roomId])

  const leaveRoom = useCallback(() => {
    if (!roomId) {
      return
    }

    const socket = getEmitSocket()
    socket.emit("room:leave", { roomId })
  }, [getEmitSocket, roomId])

  const sendChat = useCallback(
    (content) => {
      if (!roomId) {
        return
      }

      const socket = getEmitSocket()
      socket.emit("room:chat", { roomId, content })
    },
    [getEmitSocket, roomId]
  )

  const startGame = useCallback(() => {
    if (!roomId) {
      return
    }

    const socket = getEmitSocket()
    socket.emit("room:start", { roomId })
  }, [getEmitSocket, roomId])

  const onGameStart = useCallback((handler) => {
    const socket = getEmitSocket()

    socket.on("room:start", handler)

    return () => {
      socket.off("room:start", handler)
    }
  }, [getEmitSocket])

  return {
    connected,
    roomState,
    chatMessages,
    socketError,
    leaveRoom,
    sendChat,
    startGame,
    onGameStart,
  }
}
