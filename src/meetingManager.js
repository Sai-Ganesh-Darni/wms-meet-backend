const meetings = new Map();

/**
 * Generates a random meeting ID in the format of "xxxx-xxxx-xxxx" where "x" is a random alphanumeric character.
 * @returns {string} The generated meeting ID.
 */
function generateMeetingId() {
  return `${Math.random().toString(36).slice(2, 6)}-${Math.random()
    .toString(36)
    .slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Serializes a participant object to a plain JavaScript object for easier transmission over the network.
 * @param {*} participant 
 * @returns {Object} The serialized participant object containing the participant's ID, name, mute status, presentation status, and host status.
 */
function serializeParticipant(participant) {
  return {
    id: participant.id,
    name: participant.name,
    isMuted: participant.isMuted,
    isPresenting: participant.isPresenting,
    isHost: participant.isHost,
  };
}

/**
 * Serializes a meeting object to a plain JavaScript object for easier transmission over the network. 
 * It includes the meeting ID, active status, presenter ID, and an array of serialized participants.
 * 
 * @param {*} meeting 
 * @returns {Object} The serialized meeting object containing the meeting ID, active status, presenter ID, and an array of serialized participants.
 */
function serializeMeeting(meeting) {
  return {
    meetingId: meeting.meetingId,
    isActive: meeting.isActive,
    hostSocketId: meeting.hostSocketId,
    presenterId: meeting.presenterId,
    participants: Array.from(meeting.participants.values()).map(serializeParticipant),
  };
}

/**
 * Creates a new meeting with a unique meeting ID and initializes its properties.
 * @returns {Object} The created meeting object.
 */
function createMeeting() {
  const meetingId = generateMeetingId();
  meetings.set(meetingId, {
    meetingId,
    isActive: true,
    hostSocketId: null,
    presenterId: null,
    participants: new Map(),
  });
  console.log('Created Meeting: ', meetingId);
  return meetings.get(meetingId);
}

/**
 * Retrieves a meeting by its ID from the meetings map. If the meeting does not exist, it returns null.
 * @param {*} meetingId 
 * @returns {Object|null} The meeting object or null if not found.
 */
function getMeeting(meetingId) {
  return meetings.get(meetingId) || null;
}

/**
 * Deletes a meeting from the meetings map using its ID. If the meeting does not exist, it simply returns without performing any actions.
 * @param {*} meetingId 
 * @returns {void} This function does not return any value but removes the meeting from the meetings map if it exists. If the meeting does not exist, it does not perform any actions.  
 */
function deleteMeeting(meetingId) {
  meetings.delete(meetingId);
}

/**
 * Adds a participant to a meeting. It updates the meeting's participants map with the new participant and sets the host socket ID if the participant is the host. It returns the serialized participant object for transmission over the network.
 * @param {*} meeting 
 * @param {*} participant 
 * @returns {Object} The serialized participant object containing the participant's ID, name, mute status, presentation status, and host status.
 */
function addParticipant(meeting, participant) {
  meeting.participants.set(participant.id, participant);
  if (participant.isHost) {
    meeting.hostSocketId = participant.id;
  }
  return serializeParticipant(participant);
}

/**
 * Updates a participant's information in a meeting. It retrieves the participant from the meeting's participants map using the participant ID, and if found, it updates the participant's properties with the provided updates. It then returns the serialized participant object for transmission over the network. If the participant is not found, it returns null.
 * @param {*} meeting 
 * @param {*} participantId 
 * @param {*} updates 
 * @returns {Object|null} The serialized participant object with updated information or null if the participant is not found.
 */
function updateParticipant(meeting, participantId, updates) {
  const participant = meeting.participants.get(participantId);
  if (!participant) {
    return null;
  }

  Object.assign(participant, updates);
  return serializeParticipant(participant);
}

/**
 * Removes a participant from a meeting. It retrieves the participant from the meeting's participants map using the participant ID, and if found, it deletes the participant from the map. If the removed participant is the presenter or host, it also clears those roles from the meeting. It returns the serialized participant object for transmission over the network. If the participant is not found, it returns null.
 * @param {*} meeting 
 * @param {*} participantId 
 * @returns {Object|null} The serialized participant object that was removed or null if the participant is not found.
 */
function removeParticipant(meeting, participantId) {
  const participant = meeting.participants.get(participantId);
  if (!participant) {
    return null;
  }

  meeting.participants.delete(participantId);

  if (meeting.presenterId === participantId) {
    meeting.presenterId = null;
  }

  if (meeting.hostSocketId === participantId) {
    meeting.hostSocketId = null;
  }

  return serializeParticipant(participant);
}

/**
 * Sets a participant as the presenter in a meeting. It updates the meeting's presenterId with the participant ID and iterates through all participants to update their isPresenting status based on whether they are the presenter or not. This function does not return any value but modifies the meeting object to reflect the new presenter status.
 * @param {*} meeting 
 * @param {*} participantId 
 * @returns {void} This function does not return any value but updates the meeting object to set the specified participant as the presenter and updates the isPresenting status of all participants accordingly. 
 */
function setPresenter(meeting, participantId) {
  meeting.presenterId = participantId;

  meeting.participants.forEach((participant) => {
    participant.isPresenting = participant.id === participantId;
  });
}

/**
 * Clears the presenter from a meeting. It sets the meeting's presenterId to null and iterates through all participants to set their isPresenting status to false. This function does not return any value but modifies the meeting object to reflect that there is no current presenter.
 * @param {*} meeting 
 * @returns {void} This function does not return any value but updates the meeting object to clear the presenter and set the isPresenting status of all participants to false.  
 */
function clearPresenter(meeting) {
  meeting.presenterId = null;

  meeting.participants.forEach((participant) => {
    participant.isPresenting = false;
  });
}

module.exports = {
  meetings,
  createMeeting,
  getMeeting,
  deleteMeeting,
  addParticipant,
  updateParticipant,
  removeParticipant,
  setPresenter,
  clearPresenter,
  serializeMeeting,
  serializeParticipant,
};
