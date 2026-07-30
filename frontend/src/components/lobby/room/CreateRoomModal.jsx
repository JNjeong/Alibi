import { useEffect, useState } from "react"
import styles from "./CreateRoomModal.module.css"

function CreateRoomModal({
  open,
  room,
  loading = false,
  error = "",
  onClose,
  onCreate,
  onMoveToWaitingRoom
}) {
  const [title, setTitle] = useState("")
  const [localError, setLocalError] = useState("")

  useEffect(() => {
    if (open) {
      setTitle("")
      setLocalError("")
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 30) {
      setLocalError(
        "방 제목은 30자 이하로 입력해주세요."
      )
      return
    }

    setLocalError("")
    onCreate?.(trimmedTitle)
  }

  const handleOverlayClick = (event) => {
    if (
      event.target === event.currentTarget &&
      !loading
    ) {
      onClose?.()
    }
  }

  const roomId = room?.roomId || room?._id

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayClick}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={loading}
          aria-label="모달 닫기"
        >
          ×
        </button>

        {room ? (
          <div className={styles.success}>
            <div
              className={styles.successIcon}
              aria-hidden="true"
            >
              ✓
            </div>

            <h2 className={styles.successTitle}>
              방 생성 완료
            </h2>

            <p className={styles.successDescription}>
              방이 정상적으로 생성되었습니다.
              <br />
              초대 코드를 친구에게 공유해보세요.
            </p>

            <div className={styles.roomResult}>
              <span className={styles.resultLabel}>
                방 제목
              </span>

              <strong className={styles.resultTitle}>
                {room.title}
              </strong>

              <span className={styles.resultLabel}>
                초대 코드
              </span>

              <div className={styles.inviteCode}>
                {room.inviteCode}
              </div>
            </div>

            <button
              type="button"
              className={styles.moveButton}
              onClick={() => {
                if (roomId) {
                  onMoveToWaitingRoom?.(roomId)
                }
              }}
            >
              대기실로 이동
            </button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <p className={styles.eyebrow}>
                CREATE ROOM
              </p>

              <h2
                id="create-room-title"
                className={styles.title}
              >
                새 방 만들기
              </h2>

              <p className={styles.description}>
                제목을 입력하지 않으면 닉네임을
                사용해 자동으로 생성됩니다.
              </p>
            </header>

            <form
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label
                    className={styles.label}
                    htmlFor="room-title"
                  >
                    방 제목
                  </label>

                  <span className={styles.count}>
                    {title.length} / 30
                  </span>
                </div>

                <input
                  id="room-title"
                  className={styles.input}
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)

                    if (localError) {
                      setLocalError("")
                    }
                  }}
                  placeholder="예) 오늘 밤의 추리방"
                  maxLength={30}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {(localError || error) && (
                <p className={styles.error}>
                  {localError || error}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={loading}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className={styles.createButton}
                  disabled={loading}
                >
                  {loading
                    ? "생성 중..."
                    : "방 만들기"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default CreateRoomModal