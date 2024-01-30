const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const exerciseUsersSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
});

const ExerciseUsers = mongoose.model("ExerciseUsers", exerciseUsersSchema);

const exercisesSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now },
});

const Exercises = mongoose.model("Exercises", exercisesSchema);

app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.json({ error: "username is required" });
    }

    const existingUser = await ExerciseUsers.findOne({ username });
    if (existingUser) {
      return res.json({ error: "username already exists" });
    }

    const newUser = new ExerciseUsers({ username });
    const savedUser = await newUser.save();

    res.json({
      _id: savedUser._id,
      username: savedUser.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await ExerciseUsers.find({}, "_id username");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    if (!_id) {
      return res.json({ error: "_id is required" });
    }

    if (!description) {
      return res.json({ error: "description is required" });
    }

    if (!duration) {
      return res.json({ error: "duration is required" });
    }

    const userId = _id;
    const exerciseDate = date ? new Date(date) : new Date();

    if (isNaN(duration)) {
      return res.json({ error: "duration is not a number" });
    }

    if (isNaN(exerciseDate.getTime())) {
      return res.json({ error: "date is invalid" });
    }

    const user = await ExerciseUsers.findById(userId);
    if (!user) {
      return res.json({ error: "user not found" });
    }

    const newExercise = new Exercises({
      userId,
      description,
      duration,
      date: exerciseDate,
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: new Date(savedExercise.date).toDateString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users/:_id/exercises", (req, res) => {
  res.redirect(`/api/users/${req.params._id}/logs`);
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await ExerciseUsers.findById(_id);

    if (!user) {
      return res.json({ error: "user not found" });
    }

    const { from, to, limit } = req.query;

    let findConditions = { userId: _id };

    if (from || to) {
      findConditions.date = {};

      if (from) {
        findConditions.date.$gte = new Date(from);
      }

      if (to) {
        findConditions.date.$lte = new Date(to);
      }
    }

    const exercisesQuery = Exercises.find(findConditions).sort({ date: "asc" });

    if (limit) {
      exercisesQuery.limit(parseInt(limit));
    }

    const exercises = await exercisesQuery.exec();

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }

  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
