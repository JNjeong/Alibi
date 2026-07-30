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


// Excel 변환
const workbook = XLSX.utils.book_new();


// players 시트
if (gameData.players) {
    const playersSheet = XLSX.utils.json_to_sheet(
        gameData.players
    );

    XLSX.utils.book_append_sheet(
        workbook,
        playersSheet,
        "Players"
    );
}


// roles 시트
if (gameData.playersRoles) {
    const rolesSheet = XLSX.utils.json_to_sheet(
        gameData.playersRoles
    );

    XLSX.utils.book_append_sheet(
        workbook,
        rolesSheet,
        "Roles"
    );
}


// timeline 시트
if (gameData.playerTimelineMap) {

    const timelineSheet = XLSX.utils.json_to_sheet(
        Object.values(gameData.playerTimelineMap)
    );

    XLSX.utils.book_append_sheet(
        workbook,
        timelineSheet,
        "Timeline"
    );
}


// items 시트
if (gameData.items) {

    const itemsSheet = XLSX.utils.json_to_sheet(
        gameData.items
    );

    XLSX.utils.book_append_sheet(
        workbook,
        itemsSheet,
        "Items"
    );
}


// 엑셀 저장
XLSX.writeFile(
    workbook,
    "./gameResult.xlsx"
);


console.log("Excel 저장 완료!");