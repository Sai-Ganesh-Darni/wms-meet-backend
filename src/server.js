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

/**
 * Health check endpoint to verify that the server is running. It responds with a JSON object containing the status "ok".
 * @param {*} req 
 * @param {*} res 
 * @returns {Object} JSON response with the status of the server. 
 */
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

/**
 * Endpoint to create a new meeting. It generates a unique meeting ID and returns the host and participant links.
 * The host link includes a query parameter to indicate that the user is the host, while the participant link does not.
 * The response includes the meeting ID, host link, and participant link in JSON format.
 * @param {*} req 
 * @param {*} res 
 * @returns {Object} JSON response containing the meeting ID, host link, and participant link.
 */
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

/**
 * Endpoint to retrieve meeting details by meeting ID. It checks if the meeting exists and is active, and if so, it returns the serialized meeting object in JSON format. If the meeting is not found or inactive, it responds with a 404 error.
 * @param {*} req 
 * @param {*} res 
 * @returns {Object} JSON response containing the serialized meeting object or an error message if the meeting is not found.  
 */
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
