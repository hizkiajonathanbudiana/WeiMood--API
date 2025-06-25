const { MoodLog, Profile, Sequelize, SaveChat } = require("../models");

const OpenAI = require("openai");

class ChatController {
  static async getChatDetail(req, res, next) {
    try {
      const { id } = req.params;
      const chat = await SaveChat.findOne({
        where: {
          id,
          UserId: req.user.id,
        },
      });
      if (!chat) throw new Error("CHATNOTFOUND");
      res.status(200).json(chat);
    } catch (error) {
      next(error);
    }
  }
  static async deleteChat(req, res, next) {
    try {
      const { id } = req.params;
      const chat = await SaveChat.findOne({
        where: {
          id,
          UserId: req.user.id,
        },
      });
      if (!chat) throw new Error("CHATNOTFOUND");
      await chat.destroy();
      res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async getChatHistory(req, res, next) {
    try {
      const chatHistory = await SaveChat.findAll({
        where: {
          UserId: req.user.id,
        },
        order: [["createdAt", "DESC"]],
      });
      res.status(200).json(chatHistory);
    } catch (error) {
      next(error);
    }
  }

  static async saveChat(req, res, next) {
    try {
      const { text } = req.body;

      if (!text) {
        throw new Error("BADREQUEST");
      }

      await SaveChat.create({
        UserId: req.user.id,
        text,
      });

      res.status(201).json({ message: "Chat saved successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async generateChat(req, res, next) {
    try {
      const { mood, message } = req.body;

      if (!mood) {
        throw new Error("MOODNOTFOUND");
      }
      if (!message) {
        throw new Error("MESSAGENOTFOUND");
      }

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENAI_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "WeiMood",
        },
      });
      // const profile = await Profile.findOne({ //   where: { userId: 1 }, // }); // if (!profile) { //   return res.status(404).json({ error: "Profile not found" }); // }

      const profile = await Profile.findOne({
        where: { UserId: req.user.id },
      });

      if (!profile) throw new Error("PROFILENOTFOUND");

      const promptString = `
---
[CONTEXT FOR AI]

You are WeiMood created by Hizkia Jonathan Budiana, don't mention any other ai brands or names.
You are a friendly, warm, and relatable AI assistant giving a *one-time*, personalized response. This chat has no memory, so make it count and dont give any questions for user. Your response must be under 3000 characters and above 2000 character.

[USER PROFILE]
name: ${profile.displayName}
personality: ${profile.personality}
gender: ${profile.gender}
hobby: ${profile.hobbies}
favMusic: ${profile.favMusic}
favMusicGenre: ${profile.favMusicGenre}
age: ${profile.age}
country: ${profile.country}
city: ${profile.city}
interests: ${profile.interests}
activityLevel: ${profile.activityLevel}
field: ${profile.field}
status: ${profile.status}

[USER'S CURRENT SITUATION]
- Current Mood: ${mood}
- User's Message: "${message}"

[YOUR TASK]
Your top priority is to fully understand and fulfill the user's message/request. If they ask something specific, focus on that first — this is your main mission.
Then, if there's room to add value:
1. Acknowledge their mood/message with empathy.
2. If relevant, suggest 1–2 things they could do *right now*, based on their hobbies or vibe.
3. If it fits, recommend a few songs that match their current mood. 

Keep your tone chill, comforting, and human — like you're a good friend who gets them.

Remove greetings, introductions, and sign-offs. Just get straight to the point.
`;

      console.log("response");

      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1-0528:free",

        messages: [
          {
            role: "user", // profile: profile,

            content: promptString,
          },
        ],
      });

      console.log(response);

      const moodText = response.choices[0].message.content;

      const newMood = {
        mood: moodText,

        date: today,

        userId: req.user.id,
      };

      res.status(201).json(newMood);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}

module.exports = ChatController;
