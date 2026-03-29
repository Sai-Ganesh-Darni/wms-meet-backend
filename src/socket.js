const {
  addParticipant,
  clearPresenter,
  deleteMeeting,
  getMeeting,
  removeParticipant,
  serializeMeeting,
  serializeParticipant,
  setPresenter,
  updateParticipant,
} = require("./meetingManager");

function emitMeetingState(io, meetingId) {
  const meeting = getMeeting(meetingId);
  if (!meeting) {
    return;
  }

  io.to(meetingId).emit("meeting-state", serializeMeeting(meeting));
}

function disconnectMeeting(io, meetingId, reason = "Meeting ended by host") {
  const meeting = getMeeting(meetingId);
  if (!meeting) {
    return;
  }

  meeting.isActive = false;
  io.to(meetingId).emit("meeting-ended", { meetingId, reason });

  meeting.participants.forEach((participant) => {
    const targetSocket = io.sockets.sockets.get(participant.id);
    if (targetSocket) {
      targetSocket.leave(meetingId);
      targetSocket.disconnect(true);
    }
  });

  deleteMeeting(meetingId);
}

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-meeting", (payload, callback) => {
      const { meetingId, name, isHost = false, joinMuted = true } = payload || {};
      const meeting = getMeeting(meetingId);

      if (!meeting || !meeting.isActive) {
        callback?.({ ok: false, error: "Meeting not found or already ended." });
        return;
      }

      if (!name || !String(name).trim()) {
        callback?.({ ok: false, error: "Name is required." });
        return;
      }

      if (isHost && meeting.hostSocketId && meeting.hostSocketId !== socket.id) {
        callback?.({ ok: false, error: "Host is already connected to this meeting." });
        return;
      }

      const participant = {
        id: socket.id,
        name: String(name).trim(),
        isMuted: Boolean(joinMuted),
        isPresenting: false,
        isHost: Boolean(isHost),
      };

      socket.data.meetingId = meetingId;
      socket.data.isHost = participant.isHost;

      socket.join(meetingId);
      addParticipant(meeting, participant);

      callback?.({
        ok: true,
        participant: serializeParticipant(participant),
        meeting: serializeMeeting(meeting),
      });

      emitMeetingState(io, meetingId);
    });

    socket.on("toggle-mute", ({ isMuted }) => {
      const { meetingId } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting) {
        return;
      }

      updateParticipant(meeting, socket.id, { isMuted: Boolean(isMuted) });
      emitMeetingState(io, meetingId);
    });

    socket.on("start-screen-share", (_, callback) => {
      const { meetingId } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting) {
        callback?.({ ok: false, error: "Meeting not found." });
        return;
      }

      if (meeting.presenterId && meeting.presenterId !== socket.id) {
        callback?.({ ok: false, error: "Someone else is already presenting." });
        return;
      }

      setPresenter(meeting, socket.id);
      emitMeetingState(io, meetingId);
      callback?.({ ok: true });
    });

    socket.on("stop-screen-share", () => {
      const { meetingId } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting || meeting.presenterId !== socket.id) {
        return;
      }

      clearPresenter(meeting);
      emitMeetingState(io, meetingId);
    });

    socket.on("remove-participant", ({ participantId }, callback) => {
      const { meetingId, isHost } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting || !isHost) {
        callback?.({ ok: false, error: "Only the host can remove participants." });
        return;
      }

      if (participantId === socket.id) {
        callback?.({ ok: false, error: "Host cannot remove themselves." });
        return;
      }

      const removed = removeParticipant(meeting, participantId);
      if (!removed) {
        callback?.({ ok: false, error: "Participant not found." });
        return;
      }

      const targetSocket = io.sockets.sockets.get(participantId);
      targetSocket?.emit("participant-removed", {
        participantId,
        reason: "Removed by host",
      });
      targetSocket?.leave(meetingId);
      targetSocket?.disconnect(true);

      emitMeetingState(io, meetingId);
      callback?.({ ok: true });
    });

    socket.on("end-meeting", (_, callback) => {
      const { meetingId, isHost } = socket.data;
      if (!meetingId) {
        callback?.({ ok: false, error: "Meeting not found." });
        return;
      }

      if (!isHost) {
        callback?.({ ok: false, error: "Only the host can end the meeting." });
        return;
      }

      disconnectMeeting(io, meetingId);
      callback?.({ ok: true });
    });

    socket.on("webrtc-offer", ({ targetId, sdp }) => {
      io.to(targetId).emit("webrtc-offer", { fromId: socket.id, sdp });
    });

    socket.on("webrtc-answer", ({ targetId, sdp }) => {
      io.to(targetId).emit("webrtc-answer", { fromId: socket.id, sdp });
    });

    socket.on("ice-candidate", ({ targetId, candidate }) => {
      io.to(targetId).emit("ice-candidate", { fromId: socket.id, candidate });
    });

    socket.on("leave-meeting", () => {
      const { meetingId, isHost } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting) {
        return;
      }

      if (isHost) {
        disconnectMeeting(io, meetingId, "Meeting ended because the host left.");
        return;
      }

      removeParticipant(meeting, socket.id);
      socket.leave(meetingId);
      emitMeetingState(io, meetingId);
    });

    socket.on("disconnect", () => {
      const { meetingId, isHost } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting) {
        return;
      }

      if (isHost) {
        disconnectMeeting(io, meetingId, "Meeting ended because the host disconnected.");
        return;
      }

      removeParticipant(meeting, socket.id);
      emitMeetingState(io, meetingId);
    });
  });
};
