"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("MoodLogs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      happy: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      sad: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      overwhelmed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      fear: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      calm: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      bored: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      excited: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      lonely: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      UserId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("MoodLogs", ["UserId", "createdAt"], {
      unique: true,
      name: "unique_user_per_day",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("MoodLogs");
  },
};
