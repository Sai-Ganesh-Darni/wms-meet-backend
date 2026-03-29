const meetings = new Map();

function generateMeetingId() {
  return `${Math.random().toString(36).slice(2, 6)}-${Math.random()
    .toString(36)
    .slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
}

function serializeParticipant(participant) {
  return {
    id: participant.id,
    name: participant.name,
    isMuted: participant.isMuted,
    isPresenting: participant.isPresenting,
    isHost: participant.isHost,
  };
}

function serializeMeeting(meeting) {
  return {
    meetingId: meeting.meetingId,
    isActive: meeting.isActive,
    presenterId: meeting.presenterId,
    participants: Array.from(meeting.participants.values()).map(serializeParticipant),
  };
}

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

function getMeeting(meetingId) {
  return meetings.get(meetingId) || null;
}

function deleteMeeting(meetingId) {
  meetings.delete(meetingId);
}

function addParticipant(meeting, participant) {
  meeting.participants.set(participant.id, participant);
  if (participant.isHost) {
    meeting.hostSocketId = participant.id;
  }
  return serializeParticipant(participant);
}

function updateParticipant(meeting, participantId, updates) {
  const participant = meeting.participants.get(participantId);
  if (!participant) {
    return null;
  }

  Object.assign(participant, updates);
  return serializeParticipant(participant);
}

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

function setPresenter(meeting, participantId) {
  meeting.presenterId = participantId;

  meeting.participants.forEach((participant) => {
    participant.isPresenting = participant.id === participantId;
  });
}

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
