import { useState } from "react"
import UserList from "./UserList"
import FriendRequestList from "./FriendRequestList"
import FriendList from "./FriendList"

function UserSection() {
  const [friendRefreshKey, setFriendRefreshKey] = useState(0)

  const handleFriendAccepted = () => {
    setFriendRefreshKey((prev) => prev + 1)
  }

  return (
    <section className="user-section">
      <UserList />

      <FriendRequestList
        onFriendAccepted={handleFriendAccepted}
      />

      <FriendList refreshKey={friendRefreshKey} />
    </section>
  )
}

export default UserSection