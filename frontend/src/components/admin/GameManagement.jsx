import { useState, useEffect } from "react"
import { getRooms, forceEndGame } from "../../api/room_api"
import styles from "./GameManagement.module.css"
import {getGames} from "../../api/game_api"

function GameManagement() {
    const [rooms, setRooms] = useState([])
    const [games, setGames] = useState([])

    useEffect(() => {
        const fetchGames = async () => {
            try{
                const data = await getGames()
                setGames(data.games)
            } catch (error) {
                console.error(error)
            }
        }

        const fetchRooms = async () => {
            try {
                const data = await getRooms()
                setRooms(data.rooms)

            }catch (error) {
                console.error(error)
            }
        }

        fetchGames()
        fetchRooms()

        const gameinterval = setInterval(fetchGames, 20000)
        const roominterval = setInterval(fetchRooms, 20000)
        return () => {
            clearInterval(gameinterval)
            clearInterval(roominterval)
        }
    }, [])

    const handleForceEnd = async (gameId) => {
            if (!window.confirm("정말 이 게임을 강제종료하시겠습니까?")) {
                return
            }

            try {
                await forceEndGame(gameId)

                alert("게임이 강제종료되었습니다.")

                // 방 목록 다시 조회
                const data = await getRooms()
                setRooms(data.rooms)

            } catch (error) {
                console.error("게임 강제종료 오류:", error)
                alert("게임 강제종료에 실패했습니다.")
            }
        }

    const gameList = [
        ...rooms,
        ...games
            .filter(
                (game) => 
                    game.status ==="finished" ||
                    game.status === "forced"
            ).map((game) => ({
            ...game,
            roomId: game._id,
            title: game.roomSnapshot?.title || "알 수 없는 게임",
            host: {
                nickname: game.players?.[0]?.nickname || "-",
            },
            currentPlayers: game.players?.length || 0,
            maxPlayers: game.players?.length || 0,
            createdAt: game.finishedAt || game.createdAt,
        })),
    ]

    gameList.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )

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
                        <th>관리</th>
                    </tr>
                </thead>

                <tbody>

                    {gameList.map((room) => (

                        <tr key={room.roomId}>
                            <td>
                                {new Date(room.createdAt).toLocaleString("ko-KR")}
                            </td>
                            <td>{room.title}</td>
                            <td>{room.host.nickname}</td>
                            <td>
                                {room.currentPlayers}/{room.maxPlayers}
                            </td>
                            <td>
                                <span
                                    className={`${styles.statusBadge} ${
                                        room.status === "waiting"
                                            ? styles.waiting
                                            : room.status === "playing"
                                                ? styles.playing
                                                : room.status === "finished"
                                                    ? styles.finished
                                                    : room.status === "forced"
                                                        ? styles.forced
                                                        : ""
                                    }`}
                                >
                                    {room.status}
                                </span>
                            </td>
                            <td>
                                {room.status === "playing" && (
                                    <button
                                        className={styles.forceEndButton}
                                        onClick={() => handleForceEnd(room.currentGameId)}
                                    >
                                        강제종료
                                    </button>
                                )}
                            </td>
                        </tr>

                    ))}
                </tbody>
            </table>
        </div>

    )
}

export default GameManagement
