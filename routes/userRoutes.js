// routes/userRoutes.js
const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/users", userController.createUser);
router.get("/users", userController.getUsers);
router.post("/users/:userId/exercises", userController.addExercise);
router.get("/users/:userId/logs", userController.getExerciseLog);
// Add other user-related routes...

module.exports = router;
