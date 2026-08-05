// 공식 질문 전체 화면
import "./question.css"
import TargetList from "./TargetList";
import QuestionForm from "./QuestionForm";
import AnswerPanel from "./AnswerPanel";
import HistoryPanel from "./HistoryPanel";
import { useState, useEffect } from "react";
import mockGame from "../../../data/mockgame";

function OfficialQuestion() {
    const players = mockGame.players
    const [selectedPlayer, setSelectedPlayer] = useState(mockGame.players[0])
    const [answer, setAnswer] = useState(null)
    const [history, setHistory] = useState([])

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
                    selectedPlayer={selectedPlayer}
                    setAnswer={setAnswer}
                    history={history}
                    setHistory={setHistory}
                />
                <AnswerPanel
                    answer={answer}
                    setAnswer={setAnswer}
                    history={history}
                    setHistory={setHistory}
                />
                <HistoryPanel
                    history={history}
                />
            </div>
        </div>
    )
}

export default OfficialQuestion