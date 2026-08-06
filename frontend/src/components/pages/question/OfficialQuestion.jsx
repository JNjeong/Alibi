// 공식 질문 전체 화면
import "./question.css"
import TargetList from "./TargetList"
import QuestionForm from "./QuestionForm"
import AnswerPanel from "./AnswerPanel"
import HistoryPanel from "./HistoryPanel"
import { useState, useEffect } from "react"

function OfficialQuestion({ game }) {
    const players = game.players
    const places = game.mapSnapshot.places
    const times = game.rulesSnapshot.timeSlots

    const [selectedPlayer, setSelectedPlayer] = useState(null)
    useEffect(() => {
        if (players.length > 0 && !selectedPlayer) {
            setSelectedPlayer(players[0])
        }
    }, [players])

    const [answer, setAnswer] = useState(null)
    const history = game.officialRecords

    return (
        <div className="official-question">

            <TargetList
                players={players}
                selectedPlayer={selectedPlayer}
                setSelectedPlayer={setSelectedPlayer}
                history={history}
            />

            <div className="question-content">
                <QuestionForm
                    game={game}
                    selectedPlayer={selectedPlayer}
                    setAnswer={setAnswer}
                    history={history}
                    setHistory={setHistory}
                />
                <AnswerPanel
                    answer={answer}
                    setAnswer={setAnswer}
                    history={history}
                />
                <HistoryPanel
                    history={history}
                />
            </div>
        </div>
    )
}

export default OfficialQuestion