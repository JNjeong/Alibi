# ALIBI API 명세서

Express Route와 Socket Handler 기준

## 1. 공통 규칙

| 항목 | 값 |
| --- | --- |
| 로컬 서버 | `http://localhost:5000` |
| REST Base Path | `/api` |
| Content-Type | `application/json` |
| 인증 방식 | `Authorization: Bearer <JWT>` |
| Socket 인증 | 연결 handshake의 `auth.token`에 JWT 전달 |
| 성공 코드 | 조회·수정 `200`, 생성 `201` |
| 주요 오류 코드 | `400` 잘못된 입력, `401` 미인증, `403` 권한 없음, `404` 없음, `409` 상태 충돌, `500` 서버 오류 |

공통 오류 응답은 다음 형태입니다. 게임 API는 판정 가능한 경우 `code`를 함께 반환합니다.

```json
{
  "message": "오류 설명",
  "code": "OPTIONAL_GAME_ERROR_CODE"
}
```

## 2. REST API 요약

### 2.1 인증·회원·관리자 `/api/auth`

| No. | Method | Endpoint | 권한 | 요청 | 주요 응답 |
| ---: | --- | --- | --- | --- | --- |
| 1 | POST | `/signup` | 공개 | `username`, `password`, `confirmPassword`, `nickname` | 가입 메시지 |
| 2 | POST | `/login` | 공개 | `username`, `password` | `message`, `userId`, `token` |
| 3 | GET | `/me` | 사용자 | 없음 | 비밀번호를 제외한 사용자 |
| 4 | GET | `/all` | 사용자 | 없음 | 현재 사용자를 제외한 `users` |
| 5 | GET | `/search?userId={username}` | 사용자 | Query `userId` | 검색된 사용자 배열 |
| 6 | PATCH | `/profile` | 사용자 | `nickname` | `message`, 변경된 `user` |
| 7 | PATCH | `/password/check` | 사용자 | `currentPassword` | 확인 메시지 |
| 8 | PATCH | `/password` | 사용자 | `newPassword` | 변경 메시지 |
| 9 | GET | `/my-games` | 사용자 | 없음 | 최근 게임 `games` 최대 5건 |
| 10 | GET | `/admin/users` | 관리자 | 없음 | 전체 `users` |
| 11 | PATCH | `/:userId/role` | 관리자 | `role`: `user` 또는 `admin` | `message`, 변경된 `user` |
| 12 | GET | `/logs` | 관리자 | 없음 | 관리자용 `logs` |
| 13 | GET | `/dashboard` | 관리자 | 없음 | 사용자·관리자·접속자·진행 게임 집계 |

회원가입 제약:

- `username`: 4~20자
- `password`, `confirmPassword`: 8자 이상
- `nickname`: 2~20자
- 정의되지 않은 추가 필드는 허용하지 않습니다.

로그인 예시:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "alibi01",
  "password": "password123"
}
```

```json
{
  "message": "로그인 성공",
  "userId": "USER_OBJECT_ID",
  "token": "JWT"
}
```

관리자 대시보드 응답 필드:

```json
{
  "totalUsers": 10,
  "adminCount": 1,
  "onlineUsers": 4,
  "playingGames": 1,
  "recentLogs": []
}
```

### 2.2 대기방 `/api/rooms`

모든 대기방 REST API는 로그인이 필요합니다.

| No. | Method | Endpoint | 권한 | 요청 | 주요 응답 |
| ---: | --- | --- | --- | --- | --- |
| 14 | GET | `/` | 사용자 | 없음 | 종료되지 않은 `rooms` |
| 15 | POST | `/` | 사용자 | `title` 선택, 최대 30자 | `message`, 생성된 `room` |
| 16 | POST | `/join-by-code` | 사용자 | `inviteCode` | `roomId`, `currentPlayers` |
| 17 | GET | `/:roomId` | 사용자 | Path `roomId` | `room` |
| 18 | POST | `/:roomId/join` | 사용자 | Path `roomId` | 입장 결과와 현재 인원 |
| 19 | DELETE | `/:roomId` | 방장 | Path `roomId` | 삭제 메시지 |

방 응답 형식:

```json
{
  "roomId": "ROOM_OBJECT_ID",
  "title": "추리방",
  "inviteCode": "ALB-AB23",
  "host": {
    "_id": "USER_OBJECT_ID",
    "username": "alibi01",
    "nickname": "탐정"
  },
  "participants": [],
  "currentPlayers": 2,
  "maxPlayers": 10,
  "status": "waiting",
  "currentGameId": null,
  "createdAt": "2026-08-13T00:00:00.000Z"
}
```

### 2.3 친구 `/api/friends`

모든 친구 REST API는 로그인이 필요합니다. `receiverUserId`는 MongoDB ObjectId가 아니라 상대방의 로그인 아이디인 `username`입니다.

| No. | Method | Endpoint | 권한 | 요청 | 주요 응답 |
| ---: | --- | --- | --- | --- | --- |
| 20 | POST | `/request` | 사용자 | `receiverUserId`: 상대 `username` | `message`, `friendship` |
| 21 | POST | `/accept/:requesterUsername` | 사용자 | 요청자 `username` | `message`, `friendship` |
| 22 | GET | `/requests` | 사용자 | 없음 | 받은 요청 `friendRequests` |
| 23 | GET | `/` | 사용자 | 없음 | 수락된 `friends` |
| 24 | GET | `/sent-requests` | 사용자 | 없음 | 보낸 요청 `sentRequests` |
| 25 | DELETE | `/reject/:requesterUsername` | 사용자 | 요청자 `username` | 거절 메시지 |
| 26 | DELETE | `/:friendUsername` | 사용자 | 친구 `username` | 삭제 메시지 |

### 2.4 1:1 채팅 `/api/chat-rooms`

모든 채팅 REST API는 로그인이 필요하며, 해당 채팅방 참가자인지 서버가 확인합니다.

| No. | Method | Endpoint | 권한 | 요청 | 주요 응답 |
| ---: | --- | --- | --- | --- | --- |
| 27 | POST | `/open` | 친구 | `friendId`: 상대 `User._id` | `message`, `created`, `chatRoom` |
| 28 | GET | `/` | 사용자 | 없음 | 내 `chatRooms` |
| 29 | GET | `/:chatRoomId/messages` | 참가자 | 없음 | 시간순 `messages` |
| 30 | POST | `/:chatRoomId/messages` | 참가자 | `content`, 최대 1000자 | `message`, `newMessage` |
| 31 | POST | `/:chatRoomId/room-invite` | 참가자·방장 | `roomId` | `message`, 초대형 `newMessage` |
| 32 | GET | `/:chatRoomId` | 참가자 | 없음 | 상대 사용자와 마지막 메시지를 포함한 `chatRoom` |

채팅 메시지 `type`:

- `text`: 일반 텍스트
- `room_invite`: 대기방 초대. `invitedRoom`, `inviteCode` 포함

### 2.5 게임 `/api/games`

게임 API는 공통 인증 미들웨어를 사용합니다. 일반 게임 조회·제출은 해당 게임 참가자만 가능하고, 강제 종료와 전체 목록은 관리자만 가능합니다.

| No. | Method | Endpoint | 권한 | 요청 | 주요 응답 |
| ---: | --- | --- | --- | --- | --- |
| 33 | GET | `/:gameId` | 참가자 | 없음 | 사용자별 안전한 `game`, 제출 상태 |
| 34 | GET | `/:gameId/result` | 참가자 | 없음 | 종료 정답과 참가자별 판정 |
| 35 | POST | `/:gameId/statements` | 참가자 | 공식 진술 payload | `record`, `submissionStatus`, `revision`, `events` |
| 36 | POST | `/:gameId/questions` | 참가자 | 공식 질문 payload | `record`, `submissionStatus`, `revision`, `events` |
| 37 | POST | `/:gameId/questions/:questionId/answer` | 질문 대상자 | `answer`, `clientRequestId` | 답변 `record`와 진행 상태 |
| 38 | POST | `/:gameId/deductions` | 참가자 | 최종 추리 payload | `deductionStatus`, 완료 시 `resultPath` |
| 39 | POST | `/:gameId/force-end` | 관리자 | 없음 | 강제 종료 결과, 상태 `forced` |
| 40 | POST | `/:gameId/skip-stage` | 방장 | Body 없음 | `processed`, 다음 `stage`, `revision`, `events` |
| 41 | GET | `/` | 관리자 | 없음 | 전체 `games` |

#### 게임 상태 조회

`GET /api/games/:gameId`는 새로고침 복원용 상태를 반환합니다. 서버는 요청자에게 공개할 수 있는 플레이어, 라운드, 단계, 남은 시간, 공식 기록, 공개된 힌트 및 제출 상태만 제공합니다. 잠긴 힌트 값과 `secretData`는 반환하지 않습니다.

주요 상태 값:

- `status`: `playing`, `finished`, `forced`
- `stage`: `statement`, `discussion`, `question`, `answer`, `checking`, `hint`, `deduction`, `finished`
- `currentRound`: `1`~`5`
- `revision`: 클라이언트가 오래된 Socket 이벤트를 구분하기 위한 서버 상태 버전

#### 공식 진술 등록

공통 필드:

```json
{
  "round": 1,
  "clientRequestId": "CLIENT_GENERATED_UNIQUE_ID",
  "statementType": "ALIBI"
}
```

알리바이 진술 `ALIBI`:

```json
{
  "round": 1,
  "clientRequestId": "statement-uuid",
  "statementType": "ALIBI",
  "time": 20,
  "section": "section02",
  "placeId": "map_Study",
  "companionPlayerIds": ["USER_OBJECT_ID"],
  "action": "책 읽기"
}
```

도구 소지 진술 `ITEM_POSSESSION`:

```json
{
  "round": 4,
  "clientRequestId": "statement-uuid",
  "statementType": "ITEM_POSSESSION",
  "time": 21,
  "section": "section24",
  "itemId": "item_tool01"
}
```

- 공식 진술은 플레이어당 라운드 1건입니다.
- `companionPlayerIds`는 최대 1명입니다.
- `section`은 `section02`, `section24`, `section46` 중 하나입니다.
- 작성자 ID는 body에서 받지 않고 인증 토큰의 사용자 정보를 사용합니다.

#### 공식 질문 등록

```json
{
  "round": 2,
  "clientRequestId": "question-uuid",
  "questionType": "PRESENCE",
  "targetPlayerId": "TARGET_USER_OBJECT_ID",
  "time": 20,
  "section": "section02",
  "placeId": "map_Study"
}
```

`questionType`은 `PRESENCE`, `WITNESS`, `ITEM_POSSESSION` 중 하나입니다. 유형에 따라 각각 `placeId`, `subjectPlayerId`, `itemId`를 추가합니다. 한 플레이어는 라운드당 질문 1개, 게임 전체에서 최대 5개를 제출합니다.

#### 공식 질문 답변

```json
{
  "answer": true,
  "clientRequestId": "answer-uuid"
}
```

`answer`는 반드시 boolean이며 질문 대상자만 답변할 수 있습니다.

#### 최종 추리 등록

```json
{
  "criminalPlayerId": "USER_OBJECT_ID",
  "crimeTime": 21,
  "crimeSection": "section24",
  "crimePlaceId": "map_Study",
  "crimeItemId": "item_tool01",
  "clientRequestId": "deduction-uuid"
}
```

서버는 공개된 최종 장소·시간 후보와 실제 게임 참가자·도구 ID를 검증합니다. 모든 참가자의 제출이 끝나면 정답 4개 항목을 비교하고 결과를 `GameLog`에 한 번 저장합니다.

#### REST 시간 스킵

```http
POST /api/games/:gameId/skip-stage
Authorization: Bearer <JWT>
```

- 요청 body는 없습니다.
- 서버 내부 사용자 식별자는 `req.user._id`를 사용하며, 클라이언트가 사용자 ID를 따로 보내지 않습니다.
- 현재 게임의 `Room.host`와 사용자 ID가 같은 방장만 실행할 수 있습니다.
- 현재 단계의 종료 시각을 즉시 만료시키고 기존 서버 진행 함수를 호출하므로, 일반 타이머 만료와 같은 이벤트가 생성됩니다.

응답 예시:

```json
{
  "processed": true,
  "finished": false,
  "stage": "discussion",
  "stageEndsAt": "2026-08-13T00:02:00.000Z",
  "revision": 7,
  "events": []
}
```

## 3. Socket.IO 명세

### 3.1 연결

클라이언트 연결 예시:

```js
io(SERVER_URL, {
  auth: { token: localStorage.getItem("token") }
})
```

인증된 Socket은 사용자별 연결 수를 추적하며, 대기방은 `room:{roomId}`, 게임은 `game:{gameId}`, 1:1 채팅은 `chatRoom:{chatRoomId}` 네임으로 구독합니다.

### 3.2 Client → Server

| 이벤트 | Payload | Ack/설명 |
| --- | --- | --- |
| `room:join` | `{ roomId }` | 대기방 참가 및 상태·채팅 이력 수신 |
| `room:leave` | `{ roomId }` | 대기방 퇴장 |
| `room:ready` | `{ roomId, ready }` | 준비 상태 변경 |
| `room:chat` | `{ roomId, content }` | 대기방 자유 채팅 전송 |
| `room:start` | `{ roomId }` | 방장 게임 시작, ack `{ ok, ... }` |
| `game:skip-stage` | `{ gameId }` | 방장 단계 스킵 요청 |
| `game:join` | `{ gameId }` | 게임 Socket 방 참가, ack 지원 |
| `game:leave` | `{}` | 현재 게임 Socket 방 퇴장, ack 지원 |
| `joinChatRoom` | `chatRoomId` | 1:1 채팅 Socket 방 참가, ack `{ success, message, roomName }` |
| `leaveChatRoom` | `chatRoomId` | 1:1 채팅 Socket 방 퇴장, ack 지원 |

공식 진술·질문·답변·최종 추리는 REST로 저장하고, 저장 후 서버가 같은 게임 참가자에게 Socket 이벤트를 방송합니다.

### 3.3 Server → Client

#### 대기방·1:1 채팅

| 이벤트 | 주요 Payload | 설명 |
| --- | --- | --- |
| `room:participantsUpdated` | `roomId`, `host`, `participants`, `readyCount`, `canStart`, `status`, `currentGameId` | 대기방 상태 동기화 |
| `room:joined` | `room`, `chatMessages` | 대기방 참가 완료 |
| `room:left` | `roomId` | 대기방 퇴장 완료 |
| `room:start` | `roomId`, `gameId`, 방 스냅샷 | 게임 화면 이동 |
| `room:chat` | `message` | 대기방 채팅 수신 |
| `room:closed` | `roomId`, `message` | 방 삭제 알림 |
| `room:error` | `message` 등 | 대기방 처리 오류 |
| `newMessage` | `message` | 1:1 새 메시지 또는 방 초대 수신 |

#### 게임

| 이벤트 | 주요 Payload | 설명 |
| --- | --- | --- |
| `game:state` | 사용자별 게임 상태 | 게임 참가·재동기화 |
| `game:chat:history` | `messages` | 게임 채팅 이력 |
| `game:error` | `status`, `code`, `message` | 게임 처리 오류 |
| `game:record:created` | `gameId`, `record`, `revision` | 공식 기록 생성 |
| `game:submission:updated` | `submissionStatus`, `revision` | 제출 현황 갱신 |
| `game:statements:checked` | 검사 결과, `revision` | 진술 모순 검사 완료 |
| `game:round:checked` | 라운드 검사 결과, `revision` | 질문·답변 포함 최종 검사 완료 |
| `game:stage:changed` | 이전·현재 단계, 변경 사유 | 단계 변경 |
| `game:round:changed` | 이전·현재 라운드 | 다음 라운드 시작 |
| `game:hint:revealed` | 공개된 `hint` | 라운드 힌트 공개 |
| `game:timer:expired` | 라운드·단계·만료 시각 | 서버 타이머 만료 |
| `game:state:changed` | `gameId`, `revision` | REST 재조회 필요 알림 |
| `game:deduction:updated` | `deductionStatus`, `revision` | 최종 추리 제출 현황 |
| `game:finished` | `gameId`, `resultPath`, `revision` | 결과 화면 이동 |
| `game:stage:skipped` | 변경된 단계 정보 | 방장 시간 스킵 성공 |
| `game:stage:skip-error` | `message` | 방장 시간 스킵 실패 |

### 3.4 동기화 원칙

- MongoDB에 저장된 게임 상태가 기준이며 Socket은 변경 알림과 빠른 화면 갱신에 사용합니다.
- 클라이언트는 `revision`이 더 오래된 이벤트를 무시할 수 있습니다.
- 연결이 끊겼거나 화면을 새로고침한 경우 `GET /api/games/:gameId`로 현재 상태를 복원합니다.
- 서버는 게임 조회·입장 시 만료된 타이머를 `catchUp`하고, 새 게임은 시작 직후 타이머를 등록합니다.
