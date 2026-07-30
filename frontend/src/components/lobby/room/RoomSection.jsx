import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./RoomSection.module.css"
import InviteCodeForm from "./InviteCodeForm"
import RoomList from "./RoomList"
import CreateRoomButton from "./CreateRoomButton"
import CreateRoomModal from "./CreateRoomModal"
import {
  createRoom,
  getRooms,
  joinRoom,
  joinRoomByCode
} from "../../../api/room_api"

function RoomSection() {
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState("")
  const [joiningRoomId, setJoiningRoomId] = useState(null)
  const [isJoiningByCode, setIsJoiningByCode] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createdRoom, setCreatedRoom] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const fetchRooms = useCallback(async () => {
    try {
      setRoomsLoading(true)
      setRoomsError("")

      const data = await getRooms()
      setRooms(data.rooms ?? [])
    } catch (error) {
      console.error("방 목록 조회 오류:", error)
      setRoomsError(
        error.response?.data?.message ||
        "방 목록 조회에 실패했습니다."
      )
    } finally {
      setRoomsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  const handleOpenModal = () => {
    setCreatedRoom(null)
    setCreateError("")
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isCreating) return

    setIsModalOpen(false)
    setCreatedRoom(null)
    setCreateError("")
  }

  const handleCreateRoom = async (title) => {
    try {
      setIsCreating(true)
      setCreateError("")

      const data = await createRoom(title)
      setCreatedRoom(data.room)
      await fetchRooms()
    } catch (error) {
      console.error("방 생성 오류:", error)
      setCreateError(
        error.response?.data?.message ||
        "방 생성에 실패했습니다."
      )
    } finally {
      setIsCreating(false)
    }
  }

  const moveToWaitingRoom = (roomId) => {
    setIsModalOpen(false)
    navigate(`/waiting-room/${roomId}`)
  }

  const handleEnterRoom = async (room) => {
    const roomId = room.roomId || room._id

    if (!roomId || joiningRoomId) {
      return
    }

    try {
      setJoiningRoomId(roomId)
      await joinRoom(roomId)
      await fetchRooms()
      navigate(`/waiting-room/${roomId}`)
    } catch (error) {
      console.error("방 입장 오류:", error)
      alert(
        error.response?.data?.message ||
        "방 입장에 실패했습니다."
      )
    } finally {
      setJoiningRoomId(null)
    }
  }

  const handleJoinByCode = async (inviteCode) => {
    try {
      setIsJoiningByCode(true)

      const data = await joinRoomByCode(inviteCode)
      await fetchRooms()
      navigate(`/waiting-room/${data.roomId}`)
    } catch (error) {
      console.error("초대 코드 입장 오류:", error)
      alert(
        error.response?.data?.message ||
        "초대 코드로 방 입장에 실패했습니다."
      )
    } finally {
      setIsJoiningByCode(false)
    }
  }

  return (
  <section className={styles.section}>
    <div className={styles.header}>
      <div className={styles.heading}>
        <h2 className={styles.title}>
          방 목록
        </h2>

        <p className={styles.description}>
          참여할 방을 선택하거나 새로 만드세요.
        </p>
      </div>

      <div className={styles.actions}>
        <CreateRoomButton
          onClick={handleOpenModal}
          disabled={isCreating}
        />
      </div>
    </div>

    <InviteCodeForm
      onJoin={handleJoinByCode}
      loading={isJoiningByCode}
    />

    <RoomList
      rooms={rooms}
      loading={roomsLoading}
      error={roomsError}
      onEnter={handleEnterRoom}
      joiningRoomId={joiningRoomId}
    />

    <CreateRoomModal
      open={isModalOpen}
      room={createdRoom}
      loading={isCreating}
      error={createError}
      onClose={handleCloseModal}
      onCreate={handleCreateRoom}
      onMoveToWaitingRoom={moveToWaitingRoom}
    />
  </section>
)
}

export default RoomSection
