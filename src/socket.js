const { meetings } = require("./meetingManager");

module.exports = (io) => {
  io.on("connection", (socket) => {

    socket.on("join-meeting", ({ meetingId, name, role }) => {
      const meeting = meetings.get(meetingId);
      if (!meeting) return;

      if (role === "host") meeting.hostSocketId = socket.id;

      meeting.participants.push({
        socketId: socket.id,
        name,
        role
      });

      socket.join(meetingId);
      io.to(meetingId).emit("participants", meeting.participants);
    });

    socket.on("disconnect", () => {
      meetings.forEach((meeting, meetingId) => {
        meeting.participants = meeting.participants.filter(
          p => p.socketId !== socket.id
        );
        io.to(meetingId).emit("participants", meeting.participants);
      });
    });

  });
};
