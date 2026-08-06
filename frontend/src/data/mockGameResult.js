export const mockGameLog = {
  room_code: "ALB-7241",
  room_members: ["김사과", "반하나", "이메론", "윤서진"],
  room_winner: ["김사과", "윤서진"],
  room_loser: ["반하나", "이메론"],
  createdAt: "2026-08-04T12:00:00.000Z",
}

export const getMockGameLog = (roomId) => ({
  ...mockGameLog,
  room_code: roomId ? `ALB-${String(roomId).slice(-4).toUpperCase()}` : mockGameLog.room_code,
})
