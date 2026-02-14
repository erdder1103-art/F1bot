import fs from "node:fs";
import path from "node:path";

const LOG_DIR = "logs";
const LOG_FILE = path.join(LOG_DIR, "app.log");

function ensureDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {}
}

export function insertLog(action, message) {
  ensureDir();
  const line = `${new Date().toISOString()} | ${action} | ${String(message ?? "")}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch (e) {
    // 寫檔失敗也不要讓 bot 掛掉
  }
  // 同時印到 Railway logs（你看得到）
  console.log(line.trimEnd());
}
