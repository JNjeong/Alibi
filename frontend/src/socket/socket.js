import { io } from "socket.io-client"

// 백엔드의 Socket.IO 서버와 연결할 객체
const socket = io("http://localhost:5000", {
  // 우리가 원하는 시점에 직접 연결하기 위해
  // 처음 import됐을 때는 자동 연결하지 않음
  autoConnect: false,
})

export default socket