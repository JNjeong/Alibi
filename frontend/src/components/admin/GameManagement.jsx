import { useState, useEffect } from "react"
import { getRooms } from "../../api/room_api"
import styles from "./GameManagement.module.css"

function GameManagement() {
    const [rooms, setRooms] = useState([])

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const data = await getRooms()

                setRooms(data.rooms)

            }catch (error) {
                console.error(error)
            }
        }
        fetchRooms()

        const interval = setInterval(fetchRooms, 20000)
        return () => clearInterval(interval)
    })

    return (
        <div className={styles.wrapper}>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>시간</th>
                        <th>방 이름</th>
                        <th>방장</th>
                        <th>인원</th>
                        <th>상태</th>
                        
                    </tr>
                </thead>

                <tbody>

                    {rooms.map((room) => (

                        <tr key={room.roomId}>
                            <td>
                                {new Date(room.createdAt).toLocaleString("ko-KR")}
                            </td>
                            <td>{room.title}</td>
                            <td>{room.host.nickname}</td>
                            <td>
                                {room.currentPlayers}/{room.maxPlayers}
                            </td>
                            <td>{room.status}</td>
                        </tr>

                    ))}
                </tbody>
            </table>
        </div>

    )
}

export default GameManagement