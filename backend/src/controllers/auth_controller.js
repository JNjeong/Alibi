import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import AdminLog from "../models/AdminLog.js"
import Log from "../models/AdminLog.js";


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
        const user = await User.create({
            username,
            password: hashedPassword,
            nickname,
        })

        // 로그용
        await Log.create({
            type: "회원가입",
            username: user.username,
            nickname: user.nickname,
            content: "회원가입,"
        })

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

        // 최근 접속 시간 저장 -> 로그확인용
        user.lastLoginAt = new Date()
        await user.save()

        // 로그용
        await Log.create({
            type: "로그인",
            username: user.username,
            nickname: user.nickname,
            content: "로그인"
        })

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
            userId: user._id,
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

// ========= 마이페이지 =========

// 프로필 수정
export const updateProfile = async (req, res) => {
    try {
        const { nickname } = req.body

        if (!nickname || nickname.trim() === "") {
            return res.status(400).json({
                message: "닉네임을 입력해주세요.",
            });
        }

        const user = await User.findById(req.user.userId)

        if (!user) {
            return res.status(404).json({
                message: "사용자를 찾을 수 없습니다.",
            })
        }

        user.nickname = nickname.trim()

        await user.save()

        return res.status(200).json({
            message: "프로필이 수정되었습니다.",
            user: {
                _id: user._id,
                username: user.username,
                nickname: user.nickname,
                role: user.role,
            },
        })

    } catch (error) {
        console.error(error)

        return res.status(500).json({
            message: "서버 오류",
        })
    }
}

// 현재 비밀번호 확인
export const checkPassword = async (req, res) => {
    try {
        const { currentPassword } = req.body

        if (!currentPassword) {
            return res.status(400).json({
                message: "현재 비밀번호를 입력해주세요.",
            })
        }

        const user = await User.findById(req.user.userId)

        if (!user) {
            return res.status(404).json({
                message: "사용자를 찾을 수 없습니다.",
            })
        }

        const isMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "현재 비밀번호가 일치하지 않습니다.",
            })
        }

        return res.status(200).json({
            message: "현재 비밀번호가 확인되었습니다.",
        })

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        })

    }
}

// 비밀번호 변경
export const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body

        if (!newPassword) {
            return res.status(400).json({
                message: "입력값이 부족합니다.",
            })
        }

        const user = await User.findById(req.user.userId)

        if (!user) {
            return res.status(404).json({
                message: "사용자를 찾을 수 없습니다.",
            })
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: "비밀번호는 영문과 숫자를 포함한 8자 이상이어야 합니다.",
            });
        }

        // 새 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword

        await user.save()

        return res.status(200).json({
            message: "비밀번호가 변경되었습니다.",
        })

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        })
    }
}

// ========= 관리자 페이지 =========

// 권한 변경
export const updateUserRole = async (req, res) => {
    try{
        const {userId} = req.params
        const {role} = req.body
        
        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                message: "올바른 권한이 아닙니다.",
            })
        }

         const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "사용자를 찾을 수 없습니다.",
            });
        }

        user.role = role;

        await user.save();
        
        // 로그 확인용
        await Log.create({
            type: "권한 변경",
            username: req.user.username,
            nickname: req.user.nickname,
            content: `${user.username} → ${role}`,
        })

        return res.status(200).json({
            message: "권한이 변경되었습니다.",
            user,
        });

    
    }catch (error) {
        console.error(error)
        return res.status(500).json({
            message:"서버 오류"
        })
    }
}

// 모든 사용자 조회 (나 포함)
export const getAllUsersForAdmin = async (req, res) => {
    try {
        const users = await User.find().select("-password")

        return res.status(200).json({
            users,
        })
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        })
    }
}

// 로그 확인
export const getLogs = async (req, res) => {
    try {

        const logs = await Log.find()
            .sort({ createdAt: -1 })

        return res.status(200).json({
            logs,
        })

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        })

    }
}

// 대시보드
export const getDashboard = async (req, res) => {
    try {

        // 전체 회원 수
        const totalUsers = await User.countDocuments();

        // 관리자 계정 수
        const adminCount = await User.countDocuments({
            role: "admin",
        })

        // 최근 활동 5개
        const recentLogs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(5)

        return res.status(200).json({
            totalUsers,
            adminCount,
            onlineUsers: 0,
            playingGames: 0,
            recentLogs,
        })

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "서버 오류",
        })

    }
}