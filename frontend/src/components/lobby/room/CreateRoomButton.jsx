import styles from "./CreateRoomButton.module.css"

function CreateRoomButton({
  onClick,
  disabled = false
}) {
  return (
    <button
      className={styles.button}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={styles.icon}
        aria-hidden="true"
      >
        +
      </span>

      <span className={styles.label}>
        {disabled ? "생성 중..." : "방 생성"}
      </span>
    </button>
  )
}

export default CreateRoomButton