import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient, RequestStatus, Role } from "@prisma/client";
import { z } from "zod";

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

const port = Number(process.env.PORT || 5000);
const jwtSecret = process.env.JWT_SECRET || "change-this-secret";
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(5)
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(5)
});

const requestSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10)
});

const messageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(1000)
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== Role.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: Role.USER }
  });

  const token = signToken(user);
  return res.status(201).json({ token, user: { id: user.id, name, email, role: user.role } });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { name: identifier }]
    }
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get("/api/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.get("/api/chatrooms", auth, async (_req, res) => {
  const rooms = await prisma.chatroom.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } }
    }
  });

  res.json(rooms);
});

app.get("/api/chatrooms/:roomId/messages", auth, async (req, res) => {
  const room = await prisma.chatroom.findUnique({ where: { id: req.params.roomId } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const messages = await prisma.message.findMany({
    where: { roomId: req.params.roomId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, email: true } }
    }
  });

  res.json(messages);
});

app.post("/api/chatroom-requests", auth, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { name, description } = parsed.data;

  const duplicateRoom = await prisma.chatroom.findUnique({ where: { name } });
  if (duplicateRoom) {
    return res.status(409).json({ error: "A chatroom with this name already exists" });
  }

  try {
    const request = await prisma.chatroomRequest.create({
      data: {
        name,
        description,
        requesterId: req.user.id,
        status: RequestStatus.PENDING
      }
    });
    return res.status(201).json(request);
  } catch {
    return res.status(409).json({ error: "You already requested this room name" });
  }
});

app.get("/api/chatroom-requests/mine", auth, async (req, res) => {
  const requests = await prisma.chatroomRequest.findMany({
    where: { requesterId: req.user.id },
    orderBy: { createdAt: "desc" }
  });

  res.json(requests);
});

app.get("/api/admin/chatroom-requests", auth, adminOnly, async (_req, res) => {
  const requests = await prisma.chatroomRequest.findMany({
    where: { status: RequestStatus.PENDING },
    orderBy: { createdAt: "asc" },
    include: {
      requester: { select: { id: true, name: true, email: true } }
    }
  });

  res.json(requests);
});

app.post("/api/admin/chatroom-requests/:requestId/approve", auth, adminOnly, async (req, res) => {
  const existing = await prisma.chatroomRequest.findUnique({ where: { id: req.params.requestId } });
  if (!existing) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (existing.status !== RequestStatus.PENDING) {
    return res.status(400).json({ error: "Request already processed" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.chatroom.create({
      data: {
        name: existing.name,
        description: existing.description,
        createdById: existing.requesterId
      }
    });

    const request = await tx.chatroomRequest.update({
      where: { id: existing.id },
      data: {
        status: RequestStatus.APPROVED,
        reviewerId: req.user.id,
        roomId: room.id
      }
    });

    return { room, request };
  });

  res.json(result);
});

app.post("/api/admin/chatroom-requests/:requestId/reject", auth, adminOnly, async (req, res) => {
  const existing = await prisma.chatroomRequest.findUnique({ where: { id: req.params.requestId } });
  if (!existing) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (existing.status !== RequestStatus.PENDING) {
    return res.status(400).json({ error: "Request already processed" });
  }

  const request = await prisma.chatroomRequest.update({
    where: { id: existing.id },
    data: {
      status: RequestStatus.REJECTED,
      reviewerId: req.user.id
    }
  });

  res.json(request);
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    socket.user = payload;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("room:join", async ({ roomId }) => {
    const room = await prisma.chatroom.findUnique({ where: { id: roomId } });
    if (!room) {
      socket.emit("room:error", { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    socket.emit("room:joined", { roomId });
  });

  socket.on("room:message", async (payload) => {
    const parsed = messageSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("room:error", { message: "Invalid message" });
      return;
    }

    const room = await prisma.chatroom.findUnique({ where: { id: parsed.data.roomId } });
    if (!room) {
      socket.emit("room:error", { message: "Room not found" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        roomId: parsed.data.roomId,
        content: parsed.data.content,
        senderId: socket.user.id
      },
      include: {
        sender: { select: { id: true, name: true, email: true } }
      }
    });

    io.to(parsed.data.roomId).emit("room:message", message);
  });
});

app.use(express.static(clientDistPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
