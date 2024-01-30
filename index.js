const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

var Schema = mongoose.Schema;

var exerciseUsersSchema = new Schema({
  username: { type: String, unique: true, required: true },
});

var ExerciseUsers = mongoose.model("ExerciseUsers", exerciseUsersSchema);

var exercisesSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now },
});

var Exercises = mongoose.model("Exercises", exercisesSchema);

// POST new user
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

    const newUser = new ExerciseUsers({
      username: username,
    });

    const savedUser = await newUser.save();

    return res.json({
      _id: savedUser._id,
      username: savedUser.username,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await ExerciseUsers.find();
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST exercise for a user
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    if (userId === "0") {
      return res.json({ error: "_id is required" });
    }

    const user = await ExerciseUsers.findById(userId);
    if (!user) {
      return res.json({ error: "user not found" });
    }

    const { description, duration, date } = req.body;

    if (!description || !duration) {
      return res.json({ error: "description and duration are required" });
    }

    const newExercise = new Exercises({
      userId,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await newExercise.save();

    return res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: new Date(savedExercise.date).toDateString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET user's exercise log
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const user = await ExerciseUsers.findById(userId);

    if (!user) {
      return res.json({ error: "user not found" });
    }

    const { from, to, limit } = req.query;
    const findConditions = { userId };

    if (from || to) {
      findConditions.date = {};

      if (from) {
        findConditions.date.$gte = new Date(from);
      }

      if (to) {
        findConditions.date.$lte = new Date(to);
      }
    }

    let logQuery = Exercises.find(findConditions).sort({ date: "asc" });

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit)) {
        logQuery = logQuery.limit(parsedLimit);
      } else {
        return res.json({ error: "limit is not a number" });
      }
    }

    const log = await logQuery.exec();

    return res.json({
      _id: user._id,
      username: user.username,
      log: log.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      })),
      count: log.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
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
