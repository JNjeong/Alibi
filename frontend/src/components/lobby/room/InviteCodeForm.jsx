import { useState } from "react"
import styles from "./InviteCodeForm.module.css"

function InviteCodeForm({
  onJoin,
  loading = false
}) {
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedCode =
      inviteCode.trim().toUpperCase()

    if (!normalizedCode) {
      setError("초대 코드를 입력해주세요.")
      return
    }

    setError("")

    try {
      await onJoin?.(normalizedCode)
    } catch {
      // 실제 API 오류 메시지는
      // RoomSection에서 처리하고 있으므로 비워둠
    }
  }

  const handleChange = (event) => {
    setInviteCode(
      event.target.value.toUpperCase()
    )

    if (error) {
      setError("")
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <label
        className={styles.label}
        htmlFor="invite-code"
      >
        초대 코드로 입장
      </label>

      <div className={styles.inputRow}>
        <input
          id="invite-code"
          className={styles.input}
          type="text"
          value={inviteCode}
          onChange={handleChange}
          placeholder="예) ALB-7X42"
          maxLength={8}
          disabled={loading}
          autoComplete="off"
        />

        <button
          className={styles.submitButton}
          type="submit"
          disabled={loading}
        >
          {loading ? "입장 중..." : "입장"}
        </button>
      </div>

      {error && (
        <p className={styles.error}>
          {error}
        </p>
      )}
    </form>
  )
}

export default InviteCodeForm