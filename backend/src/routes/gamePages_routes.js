import express from "express"

import {
    getBriefing,
    getTimeline,
    getQuestions,
    submitStatement,
    submitQuestion,
    submitAnswer,
    submitDeduction,
} from "../controllers/gamePages_controller.js"

const router = express.Router()

// GET
router.get("/:gameId/briefing", getBriefing)
router.get("/:gameId/timeline", getTimeline)
router.get("/:gameId/questions", getQuestions)

// POST
router.post("/:gameId/statement", submitStatement)
router.post("/:gameId/question", submitQuestion)
router.post("/:gameId/answer", submitAnswer)
router.post("/:gameId/deduction", submitDeduction)

export default router