import express from "express";
import cors from "cors";
import authRouter from "./routes/auth_routes.js";
import roomRouter from "./routes/room_routes.js";
import friendRoutes from "./routes/friend_routes.js"

const app = express();

app.use(cors());
app.use(express.json());

// 인증 API
app.use("/api/auth", authRouter);


// 방 API
app.use("/api/rooms", roomRouter);
app.use("/api/friends", friendRoutes);

export default app;