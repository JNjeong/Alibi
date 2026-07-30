import express from "express"
import { login, signup, getMe ,getAllUsers, searchUsers} from "../controllers/auth_controller.js"
import validate from "../middlewares/validate_middleware.js"
import { validateSignup } from "../validators/auth_schema.js"
import { validateLogin } from "../validators/auth_schema.js"
import authMiddleware from "../middlewares/auth_middleware.js"

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

export default router;