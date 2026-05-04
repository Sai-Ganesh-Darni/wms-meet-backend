const db = require('../config');
const { DataTypes } = require('sequelize');

const MeetingLogs = db.define('meeting_logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    meeting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Meeting id of the meeting log"
    },
    event: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Event type of the meeting log"
    },
    event_description: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: "Event data of the meeting log"
    },
    created_on: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Timestamp of the meeting log"
    }
}, {
    tableName: 'meeting_logs',
    timestamps: false,
    comment: "Meeting logs table"
});

module.exports = MeetingLogs;