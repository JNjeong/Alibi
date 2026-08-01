import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import User from "../user/User.js"


export const signup = async (req, res) => {
    try {

        const { username, password, confirmPassword, nickname } = req.body

        // 2. 아이디 중복 확인
        const exists = await User.findOne({ username })

        if (exists) {
            return res.status(409).json({
                message: "이미 사용 중인 아이디입니다.",
            });
        }

        // 3. 비밀번호 확인
        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "비밀번호가 일치하지 않습니다.",
            });
        }

        // 4. 비밀번호 규칙 검사
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                    "비밀번호는 영문과 숫자를 포함한 8자 이상이어야 합니다.",
            });
        }

        // 5. 암호화
        const hashedPassword = await bcrypt.hash(password, 10)

        // 6. 저장
        await User.create({
            username,
            password: hashedPassword,
            nickname,
        });

        return res.status(201).json({
            message: "회원가입이 완료되었습니다.",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        });
    }
};

export const login = async (req, res) => {
    try {
        const {username, password} = req.body

        const user = await User.findOne({ username })

        if(!user) {
            return res.status(401).json({
                message: "아이디 또는 비밀번호가 올바르지 않습니다."
            })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if(!isMatch) {
            return res.status(401).json({
                message: "아이디 또는 비밀번호가 올바르지 않습니다."
            })
        }

        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                nickname: user.nickname
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        )

        return res.status(200).json({
            message: "로그인 성공",
            token
        })

    } catch (error) {
        console.error(error)

        return res.status(500).json({
            message: "서버 오류"
        })
    }
}

// 내 정보 조회
export const getMe = async (req, res) => {
    try {
        console.log(req.user)
        console.log(req.user.userId)
        const user = await User.findById(req.user.userId).select("-password")

        if (!user) {
            return res.status(404).json({
                message: "사용자를 찾을 수 없습니다.",
            });
        }

        return res.status(200).json(user)

    } catch (error) {
        console.error(error)

        return res.status(500).json({
            message: "서버 오류",
        })
    }
}

// 모든 사용자 조회 - 나 제외 
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.userId }
    }).select("-password")

    return res.status(200).json({
      users
    })
  } catch (error) {
    console.error("전체 사용자 조회 실패:", error)

    return res.status(500).json({
      message: "서버 오류",
    })
  }
}

// 사용자 아이디로 검색 -> 자기 자신은 제외하고 검색 결과 반환 
export const searchUsers = async (req, res) => {
    try {
        const { userId } = req.query // 검색어

        if (!userId || userId.trim() === "") { 
            return res.status(400).json({
                message: "아이디를 입력해주세요."
            })
        }

        const users = await User.find({
            _id: { $ne: req.user.userId }, // 자기 자신 제외
            $or: [ // username  검색어가 포함된 사용자 검색
                { username: { $regex: userId, $options: "i" } }
              
            ]
        }).select("-password")

        return res.status(200).json(users)
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            message: "서버 오류",
        })
    }
}
