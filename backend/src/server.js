import dotenv from "dotenv";
import http from "http";

import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/index.js";
import Map from "./models/Map.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// MongoDB 연결
try {
  await connectDB()

  // 게임 생성에 필요한 기본 Map 문서 존재 여부 확인 및 생성
  await Map.checkAndCreateDefaultMap()
} catch (error) {
  console.error("MongoDB 연결 또는 기본 Map 문서 생성 중 오류 발생:", error);
  process.exit(1);
}

const server = http.createServer(app);

// Socket.IO 초기화
initSocket(server, app);

server.listen(PORT, () => {
  console.log(`🚀 Server Running : http://localhost:${PORT}`);
});

