import dotenv from "dotenv";
import http from "http";

import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/index.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// MongoDB 연결
await connectDB();

const server = http.createServer(app);

initSocket(server, app);

server.listen(PORT, () => {
    console.log(`🚀 Server Running : http://localhost:${PORT}`);
});