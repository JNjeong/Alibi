import jwt from "jsonwebtoken"

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        // Authorization 헤더 확인
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "인증 토큰이 없습니다.",
            });
        }

        // Bearer 제거 후 토큰만 추출
        const token = authHeader.split(" ")[1]

        // JWT 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // 요청 객체에 사용자 정보 저장
        req.user = decoded

        next()
    } catch (error) {
        return res.status(401).json({
            message: "유효하지 않은 토큰입니다.",
            message: error.message,
        });
    }
};

export default authMiddleware