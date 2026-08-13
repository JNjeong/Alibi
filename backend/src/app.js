import express from "express";
import cors from "cors";
import authRouter from "./routes/auth_routes.js";
import roomRouter from "./routes/room_routes.js";
import friendRoutes from "./routes/friend_routes.js";
import chatRoomRoutes from "./routes/chatRoom_routes.js";

import gameRoutes from "./routes/game_routes.js"

const app = express();

// Cloudflare 임시 터널 주소가 실행할 때마다 바뀌므로 시연 중에는 모두 허용합니다.
app.use(cors());
app.use(express.json());

// 인증 API
app.use("/api/auth", authRouter);


// 방 API
app.use("/api/rooms", roomRouter);
app.use("/api/friends", friendRoutes);
app.use("/api/chat-rooms", chatRoomRoutes);

// 게임 페이지 API
app.use("/api/games", gameRoutes)

export default app;
