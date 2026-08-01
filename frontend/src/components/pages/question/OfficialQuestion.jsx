// 공식 질문 전체 화면
import "./question.css"
import TargetList from "./TargetList";
import QuestionForm from "./QuestionForm";
import AnswerPanel from "./AnswerPanel";
import HistoryPanel from "./HistoryPanel";
import { useState, useEffect } from "react";

function OfficialQuestion() {
    const [players, setPlayers] = useState([
        { id: 1, name: "한도윤", status: "질문 가능" },
        { id: 2, name: "박정민", status: "질문 가능" },
        { id: 3, name: "최유진", status: "질문 가능" },
        { id: 4, name: "김태현", status: "질문 가능" },
        { id: 5, name: "서지훈", status: "질문 가능" },
        { id: 6, name: "유세현", status: "질문 가능" },
        { id: 7, name: "이지훈", status: "질문 가능" },
        { id: 8, name: "강민석", status: "질문 가능" },
        { id: 9, name: "차은영", status: "질문 가능" }
    ]);
    const [selectedPlayer, setSelectedPlayer] = useState(players[0]);
    const [answer, setAnswer] = useState(null);
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
                    players={players}
                    setPlayers={setPlayers}
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