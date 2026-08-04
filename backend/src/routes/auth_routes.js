import express from "express"
import { login, signup, getMe ,getAllUsers, searchUsers,
    updateProfile, updateUserRole, getAllUsersForAdmin, changePassword, checkPassword, getLogs, getDashboard,
    } from "../controllers/auth_controller.js"
import validate from "../middlewares/validate_middleware.js"
import { validateSignup } from "../validators/auth_schema.js"
import { validateLogin } from "../validators/auth_schema.js"
import authMiddleware from "../middlewares/auth_middleware.js"
import adminMiddleware from "../middlewares/admin_middleware.js"

const router = express.Router();

router.post(
    "/signup",
    validate(validateSignup),
    signup
)

router.post(
    "/login",
    validate(validateLogin),
    login
)

router.get(
    "/me",
    authMiddleware,
    getMe
)

router.get(
    "/all",
    authMiddleware,
    getAllUsers
)

router.get(
    "/search",
    authMiddleware,
    searchUsers
)

// ==== 마이페이지 ====

// 닉네임 변경
router.patch(
    "/profile",
    authMiddleware,
    updateProfile
)

// 현재 비밀번호 확인
router.patch(
    "/password/check",
    authMiddleware,
    checkPassword
)

// 비밀번호 변경
router.patch(
    "/password",
    authMiddleware,
    changePassword
)

// ===== 관리자 페이지 ===== 

// 모든 회원 조회
router.get(
    "/admin/users",
    authMiddleware,
    adminMiddleware,
    getAllUsersForAdmin
)

// 권한 변경 (일반 유저 -> 관리자)
router.patch(
    "/:userId/role",
    authMiddleware,
    adminMiddleware,
    updateUserRole
)

// 로그확인
router.get(
    "/logs",
    authMiddleware,
    adminMiddleware,
    getLogs
)

// 대시보드
router.get(
    "/dashboard",
    authMiddleware,
    adminMiddleware,
    getDashboard
)

export default router;