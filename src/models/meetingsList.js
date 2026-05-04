/**
 * desc meetings_list;
+--------------+-------------+------+-----+---------+----------------+
| Field        | Type        | Null | Key | Default | Extra          |
+--------------+-------------+------+-----+---------+----------------+
| id           | int         | NO   | PRI | NULL    | auto_increment |
| host_id      | int         | YES  |     | NULL    |                |
| meeting_link | varchar(60) | NO   | MUL | NULL    |                |
| start_time   | datetime    | NO   |     | NULL    |                |
| end_time     | datetime    | YES  |     | NULL    |                |
| status       | int         | YES  |     | 1       |                |
+--------------+-------------+------+-----+---------+----------------+
 */

const db = require('../config');
const { DataTypes } = require('sequelize');

const MeetingsList = db.define('meetings_list', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    host_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Host id of the meeting list"
    },
    meeting_link: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: "Meeting link of the meeting list"
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Timestamp of the meeting list"
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp of the meeting list"
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: "Status of the meeting list"
    }
}, {
    tableName: 'meetings_list',
    timestamps: false,
    comment: "Meetings list table"
});

module.exports = MeetingsList;