import Header from "../../components/lobby/Header"
import RoomSection from "../../components/lobby/room/RoomSection"
import SocialPanel from "../../components/lobby/social/SocialPanel"

import styles from "./LobbyPage.module.css"

function LobbyPage() {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.content}>
        <div className={styles.layout}>
          <section className={styles.main}>
            <RoomSection />
          </section>

          <div className={styles.social}>
            <SocialPanel />
          </div>
        </div>
      </main>
    </div>
  )
}

export default LobbyPage