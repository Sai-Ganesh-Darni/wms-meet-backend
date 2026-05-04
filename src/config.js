require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false // Disable noisy logging
    }
);

sequelize.authenticate()
    .then(() => {
        console.log("Database connected via Sequelize");
    })
    .catch((err) => {
        console.error("error ", err);
    });

module.exports = sequelize;