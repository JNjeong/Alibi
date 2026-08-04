/**
 * Game.js
 * -----------------------------------------------------------------------------
 * 역할
 * - 한 번 시작된 ALIBI 게임 한 판의 진행 상태를 MongoDB에 저장합니다.
 * - 같은 Room에서 재게임하더라도 Game 문서는 매번 새로 만들어집니다.
 * - 새로고침 시 프론트의 GameContext가 이 문서를 다시 조회해 화면을 복원합니다.
 * - 공식 진술, 공식 질문/답변, 라운드 검사 결과, 최종 추리를 한곳에서 관리합니다.
 *
 * 중요한 설계 원칙
 * 1. MongoDB의 Game 문서가 진행 상태의 유일한 원본입니다.
 * 2. 공식 기록의 원본은 officialRecords 배열 하나입니다.
 * 3. GameSetter의 정답과 실제 타임라인은 secretData에만 저장합니다.
 * 4. secretData는 select: false이므로 일반 조회로는 절대 반환되지 않습니다.
 */

import mongoose from "mongoose"

// 여러 하위 스키마에서 반복해서 사용하는 Mongoose Schema 객체입니다.
const { Schema } = mongoose

// 한 게임에 참가한 사용자의 공개 스냅샷입니다.
// 닉네임이 나중에 바뀌어도 해당 판의 기록은 당시 값으로 보존됩니다.
const playerSnapshotSchema = new Schema(
  {
    // 실제 로그인 사용자의 MongoDB ObjectId입니다.
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 당시 로그인 아이디를 결과·관리자 화면에서 확인하기 위한 스냅샷입니다.
    username: {
      type: String,
      required: true,
      trim: true,
    },

    // 게임 화면에 표시할 당시 닉네임입니다.
    nickname: {
      type: String,
      required: true,
      trim: true,
    },

    // 게임에서 공개되는 배정 캐릭터 ID입니다.
    characterId: {
      type: String,
      required: true,
    },

    // role_name의 괄호 앞부분에서 분리한 캐릭터 이름입니다.
    characterName: {
      type: String,
      required: true,
    },

    // role_name의 괄호 안에서 분리한 직업/역할명입니다.
    characterOccupation: {
      type: String,
      default: "용의자",
    },

    // 공식 질문은 게임 전체에서 1인당 최대 2회이므로 원자적으로 증가시킵니다.
    questionCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
  },
  {
    // 참가자는 userId로 식별하므로 불필요한 별도 하위 _id를 만들지 않습니다.
    _id: false,
  }
)

// 라운드별 화면 문구와 진행 상태를 만드는 고정 설정 스냅샷입니다.
const roundSnapshotSchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requiredStatementType: {
      type: String,
      enum: ["ALIBI", "ITEM_POSSESSION"],
      required: true,
    },
  },
  {
    _id: false,
  }
)

// 각 라운드 종료 후 공개되는 힌트 한 건의 저장 형식입니다.
const hintSchema = new Schema(
  {
    // 코드에서 힌트를 안정적으로 구분하기 위한 이름입니다.
    key: {
      type: String,
      required: true,
    },

    // 프론트가 values의 종류를 해석할 때 사용하는 타입입니다.
    type: {
      type: String,
      enum: ["PLACE_IDS", "HOUR_RANGE", "ITEM_FEATURE", "TIME_SLOTS"],
      required: true,
    },

    // 이 라운드의 모순 검사가 끝난 뒤 힌트를 공개합니다.
    revealAfterRound: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // 공개된 힌트를 실제 진술 조건으로 사용하는 다음 라운드입니다.
    // 5라운드 힌트는 최종 추리에 사용하므로 null입니다.
    appliesToRound: {
      type: Number,
      default: null,
      min: 2,
      max: 5,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    // 장소 ID 배열, 시간 숫자 배열, {time, section} 배열 등 형식이 달라 Mixed를 씁니다.
    // 잠긴 힌트의 values는 DB에는 저장하지만 API 응답에서는 제거해야 합니다.
    values: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // null이면 아직 잠긴 힌트이고 Date가 있으면 공개된 힌트입니다.
    revealedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
  }
)

// 모순 검사에서 한 공식 기록에 붙이는 충돌 상세 정보입니다.
const conflictSchema = new Schema(
  {
    // 예: PLACE_CONFLICT, ITEM_CONFLICT, WITNESS_CONFLICT입니다.
    code: {
      type: String,
      required: true,
    },

    // 화면에 바로 표시할 수 있는 안전한 설명입니다.
    message: {
      type: String,
      default: "",
    },

    // 서로 충돌한 다른 officialRecords의 하위 문서 ID들입니다.
    relatedRecordIds: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
  },
  {
    _id: false,
  }
)

// 진술·질문·답변을 하나로 보관하는 공식 기록 스키마입니다.
// 종류별로 사용하지 않는 필드는 null로 남겨 한 배열에서 시간순으로 조회합니다.
const officialRecordSchema = new Schema(
  {
    recordType: {
      type: String,
      enum: ["statement", "question", "answer"],
      required: true,
    },

    round: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // 작성자는 프론트 payload가 아니라 인증된 req.user.userId로만 기록합니다.
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 질문을 받은 사람입니다. 진술과 답변에서는 null일 수 있습니다.
    targetId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // WITNESS 질문에서 "누구를 보았는가"의 대상 사용자입니다.
    subjectPlayerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 답변 레코드가 어떤 질문에 대한 것인지 연결하는 하위 문서 ID입니다.
    questionId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    statementType: {
      type: String,
      enum: ["ALIBI", "ITEM_POSSESSION", null],
      default: null,
    },

    questionType: {
      type: String,
      enum: ["PRESENCE", "WITNESS", "ITEM_POSSESSION", null],
      default: null,
    },

    // GameSetter의 시간 키와 일치하도록 시(hour)는 숫자로 저장합니다.
    time: {
      type: Number,
      default: null,
      min: 0,
      max: 24,
    },

    // 20분 슬롯을 GameSetter와 같은 키로 저장합니다.
    section: {
      type: String,
      enum: ["section02", "section24", "section46", null],
      default: null,
    },

    // 장소·도구는 전체 객체를 복사하지 않고 고정 DB의 ID만 저장합니다.
    placeId: {
      type: String,
      default: null,
    },

    companionPlayerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    itemId: {
      type: String,
      default: null,
    },

    claim: {
      type: String,
      enum: ["POSSESSED", "NOT_POSSESSED", null],
      default: null,
    },

    action: {
      type: String,
      default: null,
      maxlength: 300,
    },

    // 답변은 YES/NO 두 값이므로 boolean으로 저장합니다.
    answer: {
      type: Boolean,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "answered", "verified", "contradiction"],
      default: "pending",
    },

    conflicts: {
      type: [conflictSchema],
      default: [],
    },

    // 동일 버튼의 중복 클릭이나 네트워크 재전송을 구분하는 프론트 생성 ID입니다.
    clientRequestId: {
      type: String,
      required: true,
      maxlength: 120,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
)

// 한 라운드의 모순 검사 실행 결과 요약입니다.
const roundCheckSchema = new Schema(
  {
    round: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    valid: {
      type: Boolean,
      required: true,
    },
    checkedRecordCount: {
      type: Number,
      default: 0,
    },
    contradictionCount: {
      type: Number,
      default: 0,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
)

// 사용자 한 명의 최종 추리 제출값입니다.
const deductionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    criminalPlayerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    crimeTime: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    crimeSection: {
      type: String,
      enum: ["section02", "section24", "section46"],
      required: true,
    },
    crimePlaceId: {
      type: String,
      required: true,
    },
    crimeItemId: {
      type: String,
      required: true,
    },
    clientRequestId: {
      type: String,
      required: true,
      maxlength: 120,
    },

    // 실제 정답 판정은 준홍님 함수가 구현된 뒤 채웁니다.
    isCorrect: {
      type: Boolean,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
)

const gameSchema = new Schema(
  {
    // 같은 Room에서 여러 Game을 만들 수 있으므로 unique가 아닙니다.
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    // 방 제목과 코드는 방이 삭제되어도 결과 화면에서 보존할 값입니다.
    roomSnapshot: {
      title: {
        type: String,
        required: true,
      },
      inviteCode: {
        type: String,
        required: true,
      },
    },

    // playing은 진행 중, finished는 종료, aborted는 관리자 강제 종료입니다.
    status: {
      type: String,
      enum: ["playing", "finished", "aborted"],
      default: "playing",
      index: true,
    },

    // active: 진술 중 / checking: 검사 선점 / deduction: 최종 추리 / finished: 종료입니다.
    phase: {
      type: String,
      enum: ["active", "checking", "deduction", "finished"],
      default: "active",
    },

    currentRound: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },

    roundStartedAt: {
      type: Date,
      required: true,
    },

    // 프론트 타이머는 로컬 감소값이 아니라 이 서버 시각과 현재 시각의 차이로 계산합니다.
    roundEndsAt: {
      type: Date,
      required: true,
    },

    // REST 응답과 Socket 이벤트 순서가 엇갈릴 때 오래된 상태 덮어쓰기를 막습니다.
    revision: {
      type: Number,
      default: 0,
      min: 0,
    },

    players: {
      type: [playerSnapshotSchema],
      required: true,
      validate: {
        validator: (players) => players.length >= 9 && players.length <= 10,
        message: "ALIBI 게임 참가자는 9명 또는 10명이어야 합니다.",
      },
    },

    // Map.js의 고정값 중 플레이 화면에 공개해도 되는 값만 스냅샷으로 저장합니다.
    mapSnapshot: {
      story: {
        type: String,
        default: "",
      },
      places: {
        type: [Schema.Types.Mixed],
        default: [],
      },
      itemsInUse: {
        type: [Schema.Types.Mixed],
        default: [],
      },
    },

    // 피해자·발견 시각 등 공개 사건 브리핑 값입니다.
    caseBriefing: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // 게임 시작 당시의 규칙을 저장해 이후 규칙 변경에도 과거 판을 재현합니다.
    rulesSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },

    roundsSnapshot: {
      type: [roundSnapshotSchema],
      required: true,
    },

    hints: {
      type: [hintSchema],
      default: [],
    },

    officialRecords: {
      type: [officialRecordSchema],
      default: [],
    },

    roundChecks: {
      type: [roundCheckSchema],
      default: [],
    },

    deductions: {
      type: [deductionSchema],
      default: [],
    },

    /**
     * TODO(준홍님 확인·연결)
     * 아래에는 setGame()이 만든 crimeInfo, preparedPlayerTimelineMap,
     * playersRoles, witnessesMap 등 정답 관련 데이터를 저장합니다.
     * 다원님 코드나 일반 API는 내부 구조를 직접 해석하지 않습니다.
     * 준홍님의 검사 함수만 game_service.js를 통해 이 값을 사용합니다.
     */
    secretData: {
      type: Schema.Types.Mixed,
      required: true,
      select: false,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // createdAt과 updatedAt을 자동 생성합니다.
    timestamps: true,
  }
)

// 같은 방에서 진행 중인 판들을 빠르게 조회하기 위한 복합 인덱스입니다.
gameSchema.index({ roomId: 1, createdAt: -1 })

// clientRequestId 중복 검사는 service의 원자적 조건으로 수행하지만 조회 속도를 위해 인덱스를 둡니다.
gameSchema.index({ _id: 1, "officialRecords.clientRequestId": 1 })

const Game = mongoose.model("Game", gameSchema)

export default Game
