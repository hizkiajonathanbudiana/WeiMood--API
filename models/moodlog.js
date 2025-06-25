"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MoodLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MoodLog.belongsTo(models.User, {
        foreignKey: "UserId",
        as: "user",
      });
    }
  }
  MoodLog.init(
    {
      happy: { type: DataTypes.INTEGER, defaultValue: 0 },
      sad: { type: DataTypes.INTEGER, defaultValue: 0 },
      overwhelmed: { type: DataTypes.INTEGER, defaultValue: 0 },
      fear: { type: DataTypes.INTEGER, defaultValue: 0 },
      calm: { type: DataTypes.INTEGER, defaultValue: 0 },
      bored: { type: DataTypes.INTEGER, defaultValue: 0 },
      excited: { type: DataTypes.INTEGER, defaultValue: 0 },
      lonely: { type: DataTypes.INTEGER, defaultValue: 0 },
      UserId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      modelName: "MoodLog",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["UserId", "createdAt"],
          name: "unique_user_per_day",
        },
      ],
    }
  );
  return MoodLog;
};
