import express from "express";
import cors from "cors";
import authRouter from "./routes/auth_routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// 인증 API
app.use("/api/auth", authRouter);

export default app;