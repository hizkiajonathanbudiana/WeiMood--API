const { MoodLog, Profile } = require("../models");
const { Op } = require("sequelize");

class MoodController {
  static async getAllMoods(req, res, next) {
    try {
      const moods = await MoodLog.findAll({ where: { UserId: req.user.id } });
      res.status(200).json({ moods });
    } catch (error) {
      next(error);
    }
  }

  static async createOrUpdateMood(req, res, next) {
    try {
      const userId = req.user.id;
      const { mood } = req.body;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingMood = await MoodLog.findOne({
        where: {
          UserId: userId,
          createdAt: { [Op.gte]: today },
        },
      });

      if (existingMood) {
        existingMood[mood] = (existingMood[mood] || 0) + 1;
        await existingMood.save();

        return res
          .status(200)
          .json({ message: "Mood updated", mood: existingMood });
      } else {
        const newMoodData = {
          UserId: userId,
          [mood]: 1,
        };

        const newMood = await MoodLog.create(newMoodData);
        return res.status(201).json({ message: "Mood created", mood: newMood });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MoodController;
