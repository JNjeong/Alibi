/*
    게임 공통 배경
*/
import Header from "../common/Header"
import Nav from "../common/Nav"
import "./GameLayout.css"

function GameLayout({ children }) {
    return (
        <div className="game-layout">
            <Header />
            <Nav />

            <main className="game-content">
                {/* 게임 서브 페이지 들어오는 자리 */}
                {children}
            </main>
        </div>
    )
}

export default GameLayout