import { useCallback, useEffect, useState } from "react"

import { getRoomSocket } from "../api/socket"

export const useRoomSocket = (roomId) => {
  const socket = getRoomSocket()

  const [connected, setConnected] = useState(socket.connected)
  const [reconnecting, setReconnecting] = useState(false)
  const [roomState, setRoomState] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [socketError, setSocketError] = useState("")

  useEffect(() => {
    if (!roomId) {
      return undefined
    }

    const joinRoom = () => {
      socket.emit("room:join", { roomId })
    }

    const handleConnect = () => {
      setConnected(true)
      setReconnecting(false)
      setSocketError("")
      joinRoom()
    }

    const handleDisconnect = () => {
      setConnected(false)
      setReconnecting(true)
    }

    const handleReconnectAttempt = () => {
      setReconnecting(true)
      setSocketError("")
    }

    const handleReconnectFailed = () => {
      setReconnecting(false)
      setSocketError(
        "서버 연결이 끊어졌습니다. 네트워크를 확인한 뒤 다시 연결해주세요."
      )
    }

    const handleConnectError = (error) => {
      setReconnecting(false)
      setSocketError(
        error.message || "서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요."
      )
    }

    const handleJoined = ({ room, chatMessages: initialMessages = [] }) => {
      setRoomState(room)
      setChatMessages(initialMessages)
      setSocketError("")
      setReconnecting(false)
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

    const handleRoomClosed = ({ message }) => {
      setSocketError(message || "방이 종료되어 정리되었습니다.")
      setRoomState(null)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("reconnect_attempt", handleReconnectAttempt)
    socket.on("reconnect_failed", handleReconnectFailed)
    socket.on("connect_error", handleConnectError)
    socket.on("room:joined", handleJoined)
    socket.on("room:participantsUpdated", handleParticipantsUpdated)
    socket.on("room:chat", handleChat)
    socket.on("room:error", handleError)
    socket.on("room:closed", handleRoomClosed)

    if (socket.connected) {
      setConnected(true)
      joinRoom()
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("reconnect_attempt", handleReconnectAttempt)
      socket.off("reconnect_failed", handleReconnectFailed)
      socket.off("connect_error", handleConnectError)
      socket.off("room:joined", handleJoined)
      socket.off("room:participantsUpdated", handleParticipantsUpdated)
      socket.off("room:chat", handleChat)
      socket.off("room:error", handleError)
      socket.off("room:closed", handleRoomClosed)
    }
  }, [roomId, socket])

  const retryConnection = useCallback(() => {
    setSocketError("")

    socket.auth = {
      token: localStorage.getItem("token"),
    }

    if (!socket.connected) {
      setReconnecting(true)
      socket.connect()
      return
    }

    socket.emit("room:join", { roomId })
  }, [roomId, socket])

  const clearSocketError = useCallback(() => {
    setSocketError("")
  }, [])

  const leaveRoom = useCallback(() => {
    if (!roomId) {
      return
    }

    socket.emit("room:leave", { roomId })
  }, [roomId, socket])

  const sendChat = useCallback(
    (content) => {
      if (!roomId) {
        return
      }

      socket.emit("room:chat", { roomId, content })
    },
    [roomId, socket]
  )

  const setReady = useCallback(
    (ready) => {
      if (!roomId) {
        return
      }

      socket.emit("room:ready", { roomId, ready })
    },
    [roomId, socket]
  )

  const startGame = useCallback(() => {
    if (!roomId) {
      return
    }

    socket.emit("room:start", { roomId })
  }, [roomId, socket])

  const onGameStart = useCallback(
    (handler) => {
      socket.on("room:start", handler)

      return () => {
        socket.off("room:start", handler)
      }
    },
    [socket]
  )

  return {
    connected,
    reconnecting,
    roomState,
    chatMessages,
    socketError,
    leaveRoom,
    sendChat,
    setReady,
    startGame,
    onGameStart,
    retryConnection,
    clearSocketError,
  }
}
