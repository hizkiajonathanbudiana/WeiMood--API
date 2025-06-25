const { Profile } = require("../models");

class ProfileController {
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      // Find profile by userId
      const profile = await Profile.findOne({
        where: { UserId: userId },
      });

      if (!profile) {
        throw new Error("PROFILENOTFOUND");
      }

      return res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }

  static async deleteProfile(req, res, next) {
    try {
      const userId = req.user.id;

      // Find profile by userId
      const profile = await Profile.findOne({
        where: { UserId: userId },
      });

      if (!profile) {
        throw new Error("PROFILENOTFOUND");
      }

      // Delete profile
      await profile.destroy();

      return res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      //req body  contain displayName, ,  age, country, city, hobbies, interests, favMusiv, favMusicGenre, activityLevel, status, field
      const {
        displayName,
        age,
        country,
        city,
        hobbies,
        interests,
        favMusic,
        favMusicGenre,
        activityLevel,
        status,
        field,
      } = req.body;
      const userId = req.user.id;

      // Update profile
      await Profile.update(
        {
          displayName,
          age,
          country,
          city,
          hobbies,
          interests,
          favMusic,
          favMusicGenre,
          activityLevel,
          status,
          field,
        },
        { where: { UserId: userId } }
      );

      return res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async createProfile(req, res, next) {
    try {
      //req body  contain displayName, ,  age, country, city, hobbies, interests, favMusiv, favMusicGenre, activityLevel, status, field
      const {
        displayName,
        age,
        country,
        city,
        hobbies,
        interests,
        favMusic,
        favMusicGenre,
        activityLevel,
        status,
        field,
      } = req.body;
      const userId = req.user.id;

      // Create profile
      const profile = await Profile.create({
        UserId: userId,
        displayName,
        age,
        country,
        city,
        hobbies,
        interests,
        favMusic,
        favMusicGenre,
        activityLevel,
        status,
        field,
      });

      return res.status(201).json({ message: "Profile created successfully" });
    } catch (error) {
      next(error);
    }
  }
}
module.exports = ProfileController;
