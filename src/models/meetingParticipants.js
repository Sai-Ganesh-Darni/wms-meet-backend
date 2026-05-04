/**
 * desc meeting_participants;
+-------------+-------------+------+-----+---------+----------------+
| Field       | Type        | Null | Key | Default | Extra          |
+-------------+-------------+------+-----+---------+----------------+
| id          | int         | NO   | PRI | NULL    | auto_increment |
| meeting_id  | int         | NO   | MUL | NULL    |                |
| user_id     | int         | NO   |     | NULL    |                |
| socket_id   | varchar(60) | NO   |     | NULL    |                |
| name        | varchar(50) | NO   |     | NULL    |                |
| joined_time | datetime    | NO   |     | NULL    |                |
| left_time   | datetime    | NO   |     | NULL    |                |
| user_type   | int         | NO   |     | NULL    |                |
| status      | int         | YES  |     | 1       |                |
+-------------+-------------+------+-----+---------+----------------+
 */
const db = require('../config');
const { DataTypes } = require('sequelize');

const MeetingParticipants = db.define('meeting_participants', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    meeting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Meeting id of the meeting participant"
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User id of the meeting participant"
    },
    socket_id: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: "Socket id of the meeting participant"
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Name of the meeting participant"
    },
    joined_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Timestamp of the meeting participant"
    },
    left_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp of the meeting participant"
    },
    user_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User type of the meeting participant"
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: "Status of the meeting participant"
    }
}, {
    tableName: 'meeting_participants',
    timestamps: false,
    comment: "Meeting participants table"
});

module.exports = MeetingParticipants;