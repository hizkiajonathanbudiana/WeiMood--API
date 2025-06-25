"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SaveChat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SaveChat.belongsTo(models.User, {
        foreignKey: "UserId",
        as: "user",
      });
    }
  }
  SaveChat.init(
    {
      text: DataTypes.TEXT,
      UserId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "SaveChat",
    }
  );
  return SaveChat;
};
