"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Profiles", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      displayName: {
        type: Sequelize.STRING,
      },
      age: {
        type: Sequelize.STRING,
      },
      country: {
        type: Sequelize.STRING,
      },
      city: {
        type: Sequelize.STRING,
      },
      personality: {
        type: Sequelize.STRING,
      },
      hobbies: {
        type: Sequelize.STRING,
      },
      interests: {
        type: Sequelize.STRING,
      },
      favMusic: {
        type: Sequelize.STRING,
      },
      favGenreMusic: {
        type: Sequelize.STRING,
      },
      activityLevel: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      field: {
        type: Sequelize.STRING,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Profiles");
  },
};
