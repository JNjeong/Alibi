/**
 * OfficialQuestion.jsx
 * -----------------------------------------------------------------------------
 * 역할
 * - 질문 작성, 내가 받아야 할 YES/NO 답변, 전체 공식 Q&A 기록을 한 화면에 묶습니다.
 * - 로컬 history가 아니라 서버 officialRecords를 사용하므로 모든 참가자가 같은 기록을 봅니다.
 */

import { useEffect, useMemo, useState } from "react"
import "./question.css"
import GamePageHeader from "../../common/GamePageHeader"
import AnswerPanel from "./AnswerPanel"
import HistoryPanel from "./HistoryPanel"
import QuestionForm from "./QuestionForm"
import TargetList from "./TargetList"

function OfficialQuestion({ game, onSubmitQuestion, onSubmitAnswer }) {
    const maxQuestions = game.rules.maxQuestionsPerPlayer || 5
    const targets = game.players.filter(
        player => player.userId !== game.viewer.userId
    )
    const [selectedPlayerId, setSelectedPlayerId] = useState("")

    useEffect(() => {
        if (!targets.some(player => player.userId === selectedPlayerId)) {
            setSelectedPlayerId(targets[0]?.userId || "")
        }
    }, [selectedPlayerId, targets])

    const selectedPlayer = targets.find(
        player => player.userId === selectedPlayerId
    ) || null
    const pendingIncoming = useMemo(
        () => game.officialQuestions.filter(
            question =>
                question.targetId === game.viewer.userId &&
                question.status === "pending"
        ),
        [game.officialQuestions, game.viewer.userId]
    )

    return (
        <section className="game-subpage official-question-page">
            <GamePageHeader
                eyebrow="OFFICIAL Q&A"
                title="공식 질문과 답변"
                description="한 번에 하나의 사실만 묻고 YES 또는 NO로 답합니다. 모든 기록은 공개되며 모순 검사에 반영됩니다."
            >
                <span className="game-page-badge is-gold">
                    질문 {game.viewer.questionCount || 0} / {maxQuestions}
                </span>
                <span className={`game-page-badge ${game.stage === "question" || game.stage === "answer" ? "is-live" : ""}`}>
                    {game.stageLabel}
                </span>
            </GamePageHeader>

            <div className="question-workspace">
                <TargetList
                    players={targets}
                    selectedPlayer={selectedPlayer}
                    setSelectedPlayer={player => setSelectedPlayerId(player.userId)}
                    questionCount={game.viewer.questionCount || 0}
                    maxQuestions={maxQuestions}
                />

                <QuestionForm
                    game={game}
                    selectedPlayer={selectedPlayer}
                    onSubmit={onSubmitQuestion}
                />

                <div className="qa-activity-column">
                    <AnswerPanel
                        questions={pendingIncoming}
                        onSubmit={onSubmitAnswer}
                        canAnswer={game.stage === "answer"}
                        stageLabel={game.stageLabel}
                    />
                    <HistoryPanel game={game} history={game.officialQuestions} />
                </div>
            </div>
        </section>
    )
}

export default OfficialQuestion
