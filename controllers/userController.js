const { validationResult } = require("express-validator");
const User = require("../models/userModel");
const Exercise = require("../models/exerciseModel");

exports.createUser = async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username } = req.body;
    const user = new User({ username });
    const savedUser = await user.save();
    res.json(savedUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "_id username");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addExercise = async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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

// Validation rules for createUser and addExercise routes
exports.validateUser = [
  check("username").notEmpty().withMessage("Username is required"),
];

exports.validateExercise = [
  check("description").notEmpty().withMessage("Description is required"),
  check("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .isNumeric()
    .withMessage("Duration must be a number"),
  check("date")
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid date format"),
];
