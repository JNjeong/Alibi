import { io } from "socket.io-client"

const SOCKET_URL = "http://localhost:5000"

let sharedSocket = null

const socket = io(SOCKET_URL,{
  autoConnect: false,
})

export const getRoomSocket = () => {
  if (sharedSocket) {
    return sharedSocket
  }

  const token = localStorage.getItem("token")

  sharedSocket = io(SOCKET_URL, {
    autoConnect: false,
    auth: {
      token,
    },
  })

  return sharedSocket
}

export const disconnectRoomSocket = () => {
  if (sharedSocket) {
    sharedSocket.disconnect()
    sharedSocket = null
  }
}

export default socket
