import styles from "./Avatar.module.css"

function Avatar({ user, size = 48}) {
    
    const nickname = user?.nickname ?? "?"

    return (
        <div
            className={styles.avatar}
            style={{
                width: size,
                height: size,
                fontSize: size * 0.42
            }}
        >
            {nickname.charAt(0)}
            
        </div>
    )
}

export default Avatar