const meetings = new Map();

function createMeeting() {
  const meetingId = Math.random().toString(36).substring(2, 10);
  meetings.set(meetingId, {
    hostSocketId: null,
    participants: [],
    presenter: null
  });
  return meetingId;
}

module.exports = { meetings, createMeeting };
