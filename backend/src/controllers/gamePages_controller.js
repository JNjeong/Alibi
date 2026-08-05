// ? 사건 브리핑 조회
// 게임 ID를 이용해 사건 브리핑 정보를 조회
// TODO: Game 모델에서 crimeInfo 조회
export const getBriefing = async (req, res) => {
    try {
        const { gameId } = req.params

        res.status(200).json({
            success: true,
            gameId,
            crimeInfo: {
                // title: "",
                // summary: "",
                // victim: "",
                // crimeTime: "",
                // objective: []
            }
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}

// ? 개인 타임라인 조회
// 현재 플레이어의 개인 타임라인을 조회
// TODO: preparedPlayerTimelineMap에서 해당 플레이어 타임라인 반환
export const getTimeline = async (req, res) => {
    try {
        const { gameId } = req.params

        res.status(200).json({
            success: true,
            gameId,
            playerTimeline: {}
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}

// ? 공식 질문 목록 조회
// 게임 내 공식 질문 및 답변 기록을 조회
// TODO: Game 모델의 질문 기록 반환
export const getQuestions = async (req, res) => {
    try {
        const { gameId } = req.params

        res.status(200).json({
            success: true,
            gameId,
            questions: []
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}

// ? 공식 알리바이 진술 제출
// 플레이어가 작성한 공식 진술을 저장
// TODO: Game 모델의 statements에 저장
export const submitStatement = async (req, res) => {
    try {
        const { gameId } = req.params
        const { statements } = req.body

        if (!statements || statements.length === 0) {
            return res.status(400).json({
                success: false,
                message: "진술이 없습니다."
            })
        }

        res.status(200).json({
            success: true,
            gameId,
            statements
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}

// ? 공식 질문 제출
// 선택한 플레이어에게 공식 질문을 등록
// TODO: Game 모델의 questions에 질문 추가
export const submitQuestion = async (req, res) => {
    try {
        const { gameId } = req.params
        const { target, question } = req.body

        if (!target || !question) {
            return res.status(400).json({
                success: false,
                message: "질문이 없습니다."
            })
        }

        res.status(200).json({
            success: true,
            gameId,
            target,
            question
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}

// ? 공식 답변 제출
// 질문에 대한 답변을 저장
// TODO: 해당 질문의 answer 값 업데이트
export const submitAnswer = async (req, res) => {
    try {
        const { gameId } = req.params
        const { answer } = req.body

        if (!answer) {
            return res.status(400).json({
                success: false,
                message: "답변이 없습니다."
            })
        }

        res.status(200).json({
            success: true,
            gameId,
            answer
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}

// ? 최종 추리 제출
// 플레이어의 최종 추리 내용을 저장
// TODO: Game 모델의 deduction 정보 저장
export const submitDeduction = async (req, res) => {
    try {
        const { gameId } = req.params
        const deduction = req.body
        const {
            suspect,
            time,
            place,
            weapon
        } = req.body

        if (!suspect || !time || !place || !weapon) {
            return res.status(400).json({
                success: false,
                message: "추리 정보가 부족합니다."
            })
        }

        res.status(200).json({
            success: true,
            gameId,
            deduction
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}