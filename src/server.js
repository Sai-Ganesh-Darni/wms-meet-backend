const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const attachSocketHandlers = require("./socket");
const {
  createMeeting,
  getMeeting,
  serializeMeeting,
} = require("./meetingManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.post("/meeting/create", (_, res) => {
  const meeting = createMeeting();
  const hostLink = `/meet/${meeting.meetingId}?host=true`;
  const participantLink = `/meet/${meeting.meetingId}`;

  res.status(201).json({
    meetingId: meeting.meetingId,
    hostLink,
    participantLink,
  });
});

app.get("/meeting/:meetingId", (req, res) => {
  const meeting = getMeeting(req.params.meetingId);

  if (!meeting || !meeting.isActive) {
    res.status(404).json({ error: "Meeting not found." });
    return;
  }

  res.json(serializeMeeting(meeting));
});

attachSocketHandlers(io);

server.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});
