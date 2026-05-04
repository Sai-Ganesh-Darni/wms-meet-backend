const { MeetingLogs, MeetingParticipants, MeetingsList } = require('../models');

const createMeeting = async (hostId, meetingId) => {
    try {
        const meeting = await MeetingsList.create({
            host_id: hostId,
            meeting_link: meetingId,
            start_time: new Date(),
            status: 1
        });
        return meeting;
    } catch (error) {
        throw error;
    }
};

const joinMeeting = async (meetingId, userId, socketId, name, userType) => {
    try {
        const meeting = await MeetingsList.findOne({
            where: {
                meeting_link: meetingId
            }
        });
        if (!meeting) {
            throw new Error('Meeting not found');
        }
        const meetingParticipant = await MeetingParticipants.create({
            meeting_id: meeting.id,
            user_id: userId,
            socket_id: socketId,
            name: name,
            joined_time: new Date(),
            user_type: userType,
            status: 1
        });
        return meetingParticipant;
    } catch (error) {
        throw error;
    }
};

const leaveMeeting = async (meetingId, userId) => {
    try {
        const meeting = await MeetingsList.findOne({
            where: {
                meeting_link: meetingId
            }
        });
        if (!meeting) {
            throw new Error('Meeting not found');
        }
        const meetingParticipant = await MeetingParticipants.findOne({
            where: {
                meeting_id: meeting.id,
                user_id: userId
            }
        });
        if (!meetingParticipant) {
            throw new Error('Meeting participant not found');
        }
        meetingParticipant.left_time = new Date();
        await meetingParticipant.save();
        return meetingParticipant;
    } catch (error) {
        throw error;
    }
};

const endMeeting = async (meetingId) => {
    try {
        const meeting = await MeetingsList.findOne({
            where: {
                meeting_link: meetingId
            }
        });
        if (!meeting) {
            throw new Error('Meeting not found');
        }
        meeting.status = 0;
        meeting.end_time = new Date();
        await meeting.save();
        return meeting;
    } catch (error) {
        throw error;
    }
};

const meetingEvent = async (meetingId, event, eventDescription) => {
    try {
        const meeting = await MeetingsList.findOne({
            where: {
                meeting_link: meetingId
            }
        });
        if (!meeting) {
            throw new Error('Meeting not found');
        }
        const meetingEvent = await MeetingLogs.create({
            meeting_id: meeting.id,
            event: event,
            event_description: eventDescription,
            created_on: new Date()
        });
        return meetingEvent;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createMeeting,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    meetingEvent
};