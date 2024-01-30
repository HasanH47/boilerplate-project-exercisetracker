// models/userModel.js
const mongoose = require("mongoose");
const exerciseModel = require("./exerciseModel");

const userSchema = new mongoose.Schema({
  username: String,
  log: [exerciseModel.schema],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
