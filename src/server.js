const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createMeeting } = require("./meetingManager");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
});

server.listen(4000, () => {
  console.log("Backend running on 4000");
});

app.post("/meeting/create", (_, res) => {
  const meetingId = createMeeting();
  res.json({
    meetingId,
    hostLink: `/meet/${meetingId}?role=host`,
    participantLink: `/meet/${meetingId}`
  });
});