import { Bot, InlineKeyboard } from "grammy";
import dayjs from "dayjs";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

const GAS_WEBAPP_URL = process.env.GAS_WEBAPP_URL;
const GAS_SECRET = process.env.GAS_SECRET;

if (!GAS_WEBAPP_URL) throw new Error("Missing GAS_WEBAPP_URL");
if (!GAS_SECRET) throw new Error("Missing GAS_SECRET");

const bot = new Bot(BOT_TOKEN);

// ====== 你的連結設定 ======
const URL_REGISTER = "https://s.f1.top/r?p=h2pEYZ5DDuYq";
const URL_CHANNEL = "https://t.me/livebigbrother1"; // 大師兄頻道
const URL_GROUP = "https://t.me/livebigbrother";    // 大師兄群組
const URL_SUPPORT = "https://t.me/F1top_bro";       // 小編/客服

function nowStr() {
  return dayjs().format("YYYY/MM/DD HH:mm"); // 24H
}

// 避免瞬間多次同時寫入：做一個寫入佇列（很重要）
let writeQueue = Promise.resolve();
function enqueueWrite(fn) {
  writeQueue = writeQueue.then(fn).catch(() => {});
  return writeQueue;
}

// ✅ 只收集基本資訊：開始互動時間、最後互動時間、TGID、TG帳號、TG名稱
async function upsertUserBasic(ctx) {
  return enqueueWrite(async () => {
    try {
      const tgId = String(ctx.from?.id ?? "");
      if (!tgId) return;

      const username = ctx.from?.username ? `@${ctx.from.username}` : "";
      const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ").trim();

      const payload = {
        secret: GAS_SECRET,
        now: nowStr(),
        tgId,
        username,
        name,
      };

      const res = await fetch(GAS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 不讓 logger 失敗影響 bot
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("GAS log failed:", res.status, t);
      }
    } catch (e) {
      console.error("GAS log error:", e?.message || e);
    }
  });
}

// ====== 主選單（保持原本跳轉 .url）======
function mainMenu() {
  return new InlineKeyboard()
    .url("✅ 註冊帳戶", URL_REGISTER)
    .row()
    .url("📣 大師兄頻道", URL_CHANNEL)
    .row()
    .url("👥 大師兄群組", URL_GROUP)
    .row()
    .text("🎁 活動內容", "menu_promo")
    .row()
    .text("📝 領取申請表單", "menu_claim_form")
    .row()
    .url("👨‍💻 小編/客服", URL_SUPPORT);
}

// ====== 文案（你目前最終版）======
function startIntroText() {
  return (
    `嗨～我是 F1 娛樂城官方代理 🤖\n\n` +
    `🎁【10 USDT 體驗金活動】\n` +
    `這是代理專屬福利，請依照下方步驟完成申請：\n\n` +

    `📌 申請流程\n` +
    `━━━━━━━━━━━━━━\n` +
    `① 註冊帳戶並完成「錢包綁定」（⚠ 非常重要）\n` +
    `② 加入「大師兄頻道」（會審核）\n` +
    `③ 點選「領取申請表單」→ 複製並填寫完成\n` +
    `④ 點選「小編/客服」→ 貼上表單送出申請\n\n` +

    `✅ 完成以上步驟，即可申請 10 USDT 體驗金\n\n` +

    `📖 活動規則說明\n` +
    `━━━━━━━━━━━━━━\n` +
    `💰 體驗金金額：10 USDT\n` +
    `💎 最高可提領：50 USDT（超過將調整為 50 USDT）\n\n` +

    `🎮 流水規則：\n` +
    `・電子遊戲：5 倍流水\n` +
    `・其他遊戲：15 倍流水\n\n` +

    `👇 請從下方選單選擇你需要的服務：`
  );
}

function promoText() {
  return (
    `🎁【F1 娛樂城｜代理專屬活動】🎁\n\n` +
    `🔥 首次充值優惠\n` +
    `━━━━━━━━━━━━━━\n` +
    `✔ 充值送彩金：30% ～ 50%\n` +
    `✔ 流水要求：5 ～ 7 倍\n` +
    `📩 想了解適合你的方案，請直接點「小編/客服」\n\n` +

    `💰 每日投注獎勵（連續 7 天有效）\n` +
    `━━━━━━━━━━━━━━\n` +
    `說明：自會員「首存當日」起算，連續 7 天內有效\n\n` +

    `🔹 有效投注 ≥ 300 USDT\n` +
    `　🎁 獎勵 8 USDT（5 倍流水）\n\n` +

    `🔹 有效投注 ≥ 800 USDT\n` +
    `　🎁 獎勵 25 USDT（5 倍流水）\n\n` +

    `🔹 有效投注 ≥ 1500 USDT\n` +
    `　🎁 獎勵 50 USDT（5 倍流水）\n\n` +

    `📌 需要協助請點「小編/客服」`
  );
}

function claimFormText() {
  return (
    `📝【領取申請表單】（請複製填寫後回傳小編）\n\n` +

    `1) 從什麼渠道得知體驗金？\n` +
    `   [臉書&IG廣告 / TG廣告 / Live直播 / 朋友介紹(朋友會員ID)]\n\n` +

    `2) 是否玩過存 USDT 的平台？\n` +
    `   請填平台名稱（可加快審核），沒有請填「無」\n\n` +

    `3) 我的會員帳號：\n\n` +

    `4) 是否知曉體驗金規則？\n` +
    `   請回答「知道」或「不知道」\n\n` +

    `✅ 填寫完成後：\n` +
    `請點「小編/客服」→ 貼上以上內容送出即可。`
  );
}

// /start
bot.command("start", async (ctx) => {
  await upsertUserBasic(ctx);
  await ctx.reply(startIntroText(), { reply_markup: mainMenu() });
});

// 可選：只要使用者任何訊息都更新最後互動時間（更準）
// 如果你覺得太頻繁，可以註解掉
bot.on("message", async (ctx) => {
  await upsertUserBasic(ctx);
});

// 活動內容
bot.callbackQuery("menu_promo", async (ctx) => {
  await ctx.answerCallbackQuery();
  await upsertUserBasic(ctx);
  await ctx.reply(promoText(), { reply_markup: mainMenu() });
});

// 領取申請表單
bot.callbackQuery("menu_claim_form", async (ctx) => {
  await ctx.answerCallbackQuery();
  await upsertUserBasic(ctx);
  await ctx.reply(claimFormText(), { reply_markup: mainMenu() });
});

bot.catch((err) => console.error(err));
bot.start();
console.log("Bot is running...");
