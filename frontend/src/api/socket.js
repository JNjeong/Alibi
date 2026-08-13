import { io } from "socket.io-client"

// REST와 Socket이 항상 같은 서버를 바라보게 동일한 환경변수를 사용합니다.
const SOCKET_URL = (import.meta.env.VITE_SERVER_URL || "http://localhost:5000")
  .replace(/\/$/, "")

let sharedSocket = null


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
