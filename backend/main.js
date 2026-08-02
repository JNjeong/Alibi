import {setGame} from "./GameSetter.js"
import Map from "./models/Map.js"
import XLSX from "xlsx"
import fs from "fs"


const map_info = new Map().toObject()

const users = [];

for (let i = 1; i <= 10; i++) {
    users.push({
        _id: `user${i}`,
        id: `${i}${i}${i}${i}`,
        name: `Player${i}`,
        password: `Player${i}%${i}${i}${i}${i}`,
        winCnt:0,
        lostCnt:0
    });
}

const gameData = setGame(users, map_info)

// JSON 저장 (확인용)
fs.writeFileSync(
    "./gameResult.json",
    JSON.stringify(gameData, null, 2),
    "utf-8"
);

console.log("생성 완료")