// 게임 관련 라우트 정의
const express = require('express')
const router = express.Router();
const gameController = require('../controllers/game_controller')

router.get('/bootstrap', gameController.bootstrap)
router.get('/active', gameController.activeGame)
router.get('/result', gameController.result)

module.exports = router