import RolePanel from "./RolePanel"
import TimelineBlock from "./TimelineBlock"
import "./timeline.css"

function PrivateTimeline({ game }) {
    const [gameData, setGameData] = useState(null)

    useEffect(() => {
        async function loadGame() {
            try {
                const data = await getGame("게임ID")
                setGameData(data)
            }
            catch (err) {
                console.error(err)
            }
        }
        loadGame()
    }, [])

    if (!gameData) {
        return <div>불러오는 중...</div>
    }

    return (
        <div className="private-timeline-page">
            <div className="private-timeline-container">
                <RolePanel
                    game={game}
                    viewer={game.viewer}
                />
                <TimelineBlock
                    game={game}
                    viewer={game.viewer}
                />
            </div>
        </div>
    )
}

export default PrivateTimeline