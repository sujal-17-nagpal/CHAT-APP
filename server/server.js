import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDb } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const app = express();

const server = http.createServer(app);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

//initialize socket.io server
export const io = new Server(server, { cors: { origin: "*" } });

//store online users
export const userSocketMap = {}; // {userId : socketId}

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    return next(new Error("Authentication error"));
  }
});

// Socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log("User Connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  socket.on("disconnect", () => {
    console.log("User Disconnected", userId);
    delete userSocketMap[userId];
  });
});

app.use("/api/status", (req, res) => {
  res.send("Server is live");
});

app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

await connectDb();

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`server in running on port: ${PORT}`);
  });
}

//export server for vercel
export default server
