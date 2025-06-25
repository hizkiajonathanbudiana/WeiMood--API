"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Profile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Profile.belongsTo(models.User, {
        foreignKey: "UserId",
        as: "user",
      });
    }
  }
  Profile.init(
    {
      displayName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Display name cannot be empty" },
          notNull: { msg: "Display name is required" },
        },
      },
      age: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Age cannot be empty" },
          notNull: { msg: "Age is required" },
        },
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Country cannot be empty" },
          notNull: { msg: "Country is required" },
        },
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "City cannot be empty" },
          notNull: { msg: "City is required" },
        },
      },
      personality: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Personality cannot be empty" },
          notNull: { msg: "Personality is required" },
        },
      },
      hobbies: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Hobbies cannot be empty" },
          notNull: { msg: "Hobbies are required" },
        },
      },
      interests: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Interests cannot be empty" },
          notNull: { msg: "Interests are required" },
        },
      },
      favMusic: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Favorite music cannot be empty" },
          notNull: { msg: "Favorite music is required" },
        },
      },
      favGenreMusic: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Favorite genre music cannot be empty" },
          notNull: { msg: "Favorite genre music is required" },
        },
      },
      activityLevel: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Activity level cannot be empty" },
          notNull: { msg: "Activity level is required" },
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Status cannot be empty" },
          notNull: { msg: "Status is required" },
        },
      },
      field: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Field cannot be empty" },
          notNull: { msg: "Field is required" },
        },
      },
      UserId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Profile",
    }
  );
  return Profile;
};
