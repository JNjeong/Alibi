import express from "express";
import cors from "cors";
import authRouter from "./routes/auth_routes.js";
import roomRouter from "./routes/room_routes.js";
import friendRoutes from "./routes/friend_routes.js";
import chatRoomRoutes from "./routes/chatRoom_routes.js";
import gameLogRoutes from "./routes/gameLog_routes.js";
import gameRoutes from "./routes/game_routes.js"

const app = express();

app.use(cors({
    origin : process.env.FRONTEND_URL?.split(",") ?? ["http://localhost:5173"],
    credentials : true,
    methods : ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders : ["Content-Type", "Authorization"],
    exposedHeaders : ["Authorization"]
  }));
  
app.use(express.json());

// 인증 API
app.use("/api/auth", authRouter);


// 방 API
app.use("/api/rooms", roomRouter);
app.use("/api/friends", friendRoutes);
app.use("/api/chat-rooms", chatRoomRoutes);
app.use("/api/game-logs", gameLogRoutes);

// 게임 API
app.use("/api/game", gameRoutes)

export default app;