import User from "../models/User.js";

const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "사용자를 찾을 수 없습니다.",
            });
        }

        if (user.role !== "admin") {
            return res.status(403).json({
                message: "관리자만 접근할 수 있습니다.",
            });
        }

        next();
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        });
    }
};

export default adminMiddleware;