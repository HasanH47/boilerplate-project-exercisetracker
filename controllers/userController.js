// controllers/userController.js
const User = require("../models/userModel");
const Exercise = require("../models/exerciseModel");

exports.createUser = async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    const savedUser = await user.save();
    res.json(savedUser);
  } catch (error) {
    res.status(400).json({ error: "Error creating user" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "_id username");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addExercise = async (req, res) => {
  try {
    const { userId } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = new Exercise({
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    user.log.push(exercise);
    await user.save();

    res.json({
      username: user.username,
      userId: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getExerciseLog = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { from, to, limit } = req.query;

    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    // Filter the log entries based on the date range
    const log = user.log.filter((exercise) => {
      const exerciseDate = new Date(exercise.date);
      return exerciseDate >= fromDate && exerciseDate <= toDate;
    });

    // Apply the limit if specified
    const limitedLog = limit ? log.slice(0, limit) : log;

    res.json({
      username: user.username,
      userId: user._id,
      count: limitedLog.length,
      log: limitedLog.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// You can add other functions as needed...
