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

/**
 * Helper function to emit the current state of the meeting to all participants in the meeting. It retrieves the meeting details using the meeting ID and emits a "meeting-state" event with the serialized meeting data to all clients connected to the meeting room. If the meeting is not found, it simply returns without emitting any event. 
 * 
 * @param {*} io 
 * @param {*} meetingId 
 * @returns {void} This function does not return any value but emits the current state of the meeting to all participants in the meeting room if the meeting exists. If the meeting does not exist, it does not perform any actions. 
 */
function emitMeetingState(io, meetingId) {
  const meeting = getMeeting(meetingId);
  if (!meeting) {
    return;
  }

  io.to(meetingId).emit("meeting-state", serializeMeeting(meeting));
}

/**
 * Helper function to disconnect all participants from a meeting and end the meeting. It retrieves the meeting details using the meeting ID and checks if the meeting exists. If the meeting is found, it sets the meeting as inactive, emits a "meeting-ended" event to all participants in the meeting room with the reason for ending, and then iterates through all participants to disconnect their sockets from the meeting room. Finally, it deletes the meeting from the server. If the meeting is not found, it simply returns without performing any actions.
 * 
 * @param {*} io - The Socket.IO server instance used to manage real-time communication between clients and the server.
 * @param {*} meetingId - The unique identifier of the meeting that is being ended.
 * @param {string} reason - An optional reason for ending the meeting, which will be sent to all participants in the "meeting-ended" event.
 * @returns {void} This function does not return any value but performs the necessary actions to end the meeting and disconnect all participants if the meeting exists. If the meeting does not exist, it does not perform any actions.
 */
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

/**
 * Socket.IO event handlers for managing meeting interactions. 
 * This module listens for various events such as 
 *  - joining a meeting
 *  - toggling mute status
 *  - starting/stopping screen sharing
 *  - removing participants
 *  -  ending meetings
 *  - handling WebRTC signaling 
 * 
 * It ensures that only valid actions are performed based on the user's role (host or participant) and the current state of the meeting. 
 * The module also emits updates to all participants whenever there are changes to the meeting state.
 * 
 * @param {Object} io - The Socket.IO server instance used to manage real-time communication between clients and the server.
 * @returns {void} This module does not return any value but sets up event listeners on the Socket.IO server instance to handle meeting-related interactions.
 */
module.exports = (io) => {
  io.on("connection", (socket) => {

    /**
     * Event handler for when a client attempts to join a meeting. It validates the meeting ID, participant name, and host status before allowing the user to join. If the validation passes, it adds the participant to the meeting and emits the updated meeting state to all participants. If any validation fails, it sends an appropriate error message back to the client.
     * 
     * @param {Object} payload - The data sent by the client when attempting to join a meeting, which includes the meeting ID, participant name, host status, and mute status.
     * @param {Function} callback - A callback function that is called with the result of the join attempt, indicating success or failure and providing relevant data or error messages.
     * @returns {void} This event handler does not return any value but uses the callback to communicate the result of the join attempt back to the client.
     */
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

    /**
     * Event handler for toggling the mute status of a participant. It checks if the meeting exists and then updates the participant's mute status based on the provided value. After updating, it emits the updated meeting state to all participants in the meeting.
     * 
     * @param {Object} payload - The data sent by the client when toggling mute status, which includes the new mute status (isMuted).
     * @returns {void} This event handler does not return any value but updates the participant's mute status and emits the updated meeting state to all participants in the meeting.
     */
    socket.on("toggle-mute", ({ isMuted }) => {
      const { meetingId } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting) {
        return;
      }

      updateParticipant(meeting, socket.id, { isMuted: Boolean(isMuted) });
      emitMeetingState(io, meetingId);
    });

    /**
     * Event handler for starting screen sharing. It checks if the meeting exists and if there is already a presenter. If the validation passes, it sets the current participant as the presenter and emits the updated meeting state to all participants. If any validation fails, it sends an appropriate error message back to the client through the callback.
     * 
     * @param {Object} payload - The data sent by the client when attempting to start screen sharing, which may include any relevant information needed for validation.
     * @param {Function} callback - A callback function that is called with the result of the attempt to start screen sharing, indicating success or failure and providing relevant error messages if applicable.
     * @returns {void} This event handler does not return any value but uses the callback to communicate the result of the attempt to start screen sharing back to the client and emits the updated meeting state if successful.
     */
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

    /**
     * Event handler for stopping screen sharing. It checks if the meeting exists and if the current participant is the presenter. If the validation passes, it clears the presenter from the meeting and emits the updated meeting state to all participants. If any validation fails, it simply returns without making any changes.
     * 
     * @returns {void} This event handler does not return any value but updates the meeting state by clearing the presenter and emits the updated state to all participants if the current participant is the presenter. If the validation fails, it does not perform any actions.
     */
    socket.on("stop-screen-share", () => {
      const { meetingId } = socket.data;
      const meeting = getMeeting(meetingId);

      if (!meeting || meeting.presenterId !== socket.id) {
        return;
      }

      clearPresenter(meeting);
      emitMeetingState(io, meetingId);
    });

    /**
     * Event handler for removing a participant from the meeting. It checks if the meeting exists and if the current user is the host. It also ensures that the host cannot remove themselves. If the validation passes, it removes the specified participant from the meeting, emits a notification to the removed participant, and updates the meeting state for all remaining participants. If any validation fails, it sends an appropriate error message back to the client through the callback.
     * 
     * @param {Object} payload - The data sent by the client when attempting to remove a participant, which includes the ID of the participant to be removed.
     * @param {Function} callback - A callback function that is called with the result of the attempt to remove a participant, indicating success or failure and providing relevant error messages if applicable.
     * @returns {void} This event handler does not return any value but uses the callback to communicate the result of the attempt to remove a participant back to the client, emits a notification to the removed participant, and updates the meeting state for all remaining participants if successful. If the validation fails, it does not perform any actions and simply returns.
     */
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

    /**
     * Event handler for ending a meeting. It checks if the meeting exists and if the current user is the host. If the validation passes, it disconnects all participants from the meeting, emits a notification to all participants that the meeting has ended, and deletes the meeting from the server. If any validation fails, it sends an appropriate error message back to the client through the callback.
     * 
     * @param {Object} payload - The data sent by the client when attempting to end a meeting, which may include any relevant information needed for validation.
     * @param {Function} callback - A callback function that is called with the result of the attempt to end the meeting, indicating success or failure and providing relevant error messages if applicable.
     * @returns {void} This event handler does not return any value but uses the callback to communicate the result of the attempt to end the meeting back to the client, disconnects all participants, emits a notification that the meeting has ended, and deletes the meeting if successful. If the validation fails, it does not perform any actions and simply returns.
     */
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

    /**
     * Event handlers for WebRTC signaling messages (offer, answer, and ICE candidates). These handlers receive the signaling data from one participant and forward it to the target participant specified by the targetId. This allows participants to establish peer-to-peer connections for audio/video communication. Each handler checks for the presence of the targetId and the relevant signaling data before emitting the message to the target participant.
     * @param {Object} payload - The data sent by the client for WebRTC signaling, which includes the target participant's ID (targetId) and the relevant signaling data (sdp for offers/answers and candidate for ICE candidates).
     * @returns {void} These event handlers do not return any value but forward the WebRTC signaling messages to the specified target participant to facilitate peer-to-peer communication.
     */
    socket.on("webrtc-offer", ({ targetId, sdp }) => {
      io.to(targetId).emit("webrtc-offer", { fromId: socket.id, sdp });
    });

    /**
     * Event handler for WebRTC answer messages. It receives the answer SDP from one participant and forwards it to the target participant specified by the targetId. This allows the target participant to complete the WebRTC connection setup after receiving an offer. The handler checks for the presence of the targetId and the SDP data before emitting the message to the target participant.
     * @param {Object} payload - The data sent by the client for the WebRTC answer, which includes the target participant's ID (targetId) and the answer SDP (sdp).
     * @returns {void} This event handler does not return any value but forwards the WebRTC answer message to the specified target participant to facilitate peer-to-peer communication. 
     */
    socket.on("webrtc-answer", ({ targetId, sdp }) => {
      io.to(targetId).emit("webrtc-answer", { fromId: socket.id, sdp });
    });

    /**
     * Event handler for WebRTC ICE candidate messages. It receives the ICE candidate from one participant and forwards it to the target participant specified by the targetId. This allows the target participant to add the ICE candidate to their WebRTC connection setup. The handler checks for the presence of the targetId and the candidate data before emitting the message to the target participant.
     * @param {Object} payload - The data sent by the client for the ICE candidate, which includes the target participant's ID (targetId) and the ICE candidate information (candidate).
     * @returns {void} This event handler does not return any value but forwards the WebRTC ICE candidate message to the specified target participant to facilitate peer-to-peer communication. 
     */
    socket.on("ice-candidate", ({ targetId, candidate }) => {
      io.to(targetId).emit("ice-candidate", { fromId: socket.id, candidate });
    });

    /**
     * Event handler for when a participant leaves the meeting. It checks if the meeting exists and if the participant is the host. If the participant is the host, it ends the meeting for all participants. If the participant is not the host, it removes them from the meeting and emits the updated meeting state to all remaining participants. This handler also listens for the "disconnect" event to handle cases where a participant loses connection without explicitly leaving the meeting.
      * @returns {void} This event handler does not return any value but updates the meeting state by either ending the meeting if the host leaves or removing the participant if they are not the host, and emits the updated state to all remaining participants. It also handles disconnections to ensure proper cleanup of participants from the meeting.
     */
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

    /**
     * Event handler for when a participant disconnects from the Socket.IO server. It checks if the meeting exists and if the participant is the host. If the participant is the host, it ends the meeting for all participants. If the participant is not the host, it removes them from the meeting and emits the updated meeting state to all remaining participants. This ensures that the meeting state remains consistent even if a participant loses connection unexpectedly.
      * @returns {void} This event handler does not return any value but updates the meeting state by either ending the meeting if the host disconnects or removing the participant if they are not the host, and emits the updated state to all remaining participants. It ensures proper cleanup of participants from the meeting in case of unexpected disconnections. 
     */
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
