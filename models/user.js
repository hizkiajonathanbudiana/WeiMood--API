"use strict";
const { Model } = require("sequelize");
const { hashPassword } = require("../helpers/bcrypt");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasOne(models.Profile, { foreignKey: "UserId" });
      User.hasMany(models.MoodLog, { foreignKey: "UserId" });
      User.hasMany(models.SaveChat, { foreignKey: "UserId" });
    }
  }

  User.init(
    {
      email: {
        type: DataTypes.STRING,
        unique: { msg: "Email must be unique" },
        allowNull: false,
        validate: {
          isEmail: { msg: "Invalid email format" },
          notEmpty: { msg: "Email cannot be empty" },
          notNull: { msg: "Email is required" },
        },
      },
      password: { type: DataTypes.STRING, allowNull: true },
      googleSub: { type: DataTypes.STRING, allowNull: true },
      provider: { type: DataTypes.STRING, allowNull: true },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "User",
      hooks: {
        beforeCreate: async (user, options) => {
          if (user.password) {
            // Tambahkan pengecekan jika password ada (untuk login Google)
            user.password = await hashPassword(user.password);
          }
        },
      },
    }
  );
  return User;
};
