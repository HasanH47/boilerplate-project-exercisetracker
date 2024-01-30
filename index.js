const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", (error) => console.error("MongoDB connection error:", error));
db.once("open", () => console.log("Connected to MongoDB"));

// Schema for Exercise
const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date,
});

// Schema for User
const userSchema = new mongoose.Schema({
  username: String,
  log: [exerciseSchema],
});

const User = mongoose.model("User", userSchema);

app.use(express.static("public"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

// Routes
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    const savedUser = await user.save();
    res.json(savedUser);
  } catch (error) {
    res.status(400).json({ error: "Error creating user" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "_id username");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = {
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    };

    user.log.push(exercise);
    await user.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let { from, to, limit } = req.query;

    from = from ? new Date(from) : new Date(0);
    to = to ? new Date(to) : new Date();
    limit = limit ? parseInt(limit) : user.log.length;

    const log = user.log.filter((exercise) => {
      const exerciseDate = new Date(exercise.date);
      return exerciseDate >= from && exerciseDate <= to;
    });

    res.json({
      username: user.username,
      count: log.length,
      log: log.slice(0, limit).map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Server listening
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
