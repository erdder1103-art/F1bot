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
const URL_CHANNEL = "https://t.me/livebigbrother1";
const URL_GROUP = "https://t.me/livebigbrother";
const URL_SUPPORT = "https://t.me/F1top_bro";

function nowStr() {
  return dayjs().utcOffset(8).format("YYYY/MM/DD HH:mm");
}

// ====== 寫入佇列 ======
let writeQueue = Promise.resolve();
function enqueueWrite(fn) {
  writeQueue = writeQueue.then(fn).catch(console.error);
  return writeQueue;
}

// ====== 寫入 GAS ======
async function upsertUserBasic(ctx) {
  return enqueueWrite(async () => {
    try {
      const tgId = String(ctx.from?.id ?? "");
      if (!tgId) return;

      const username = ctx.from?.username ? `@${ctx.from.username}` : "";
      const name = [ctx.from?.first_name, ctx.from?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      const payload = {
        secret: GAS_SECRET,
        now: nowStr(),
        tgId,
        username,
        name,
      };

      console.log("Sending to GAS:", payload);

      const res = await fetch(GAS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("GAS status:", res.status);
      console.log("GAS response:", text);

    } catch (e) {
      console.error("GAS error:", e?.message || e);
    }
  });
}

// ====== 主選單 ======
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

// ====== 文字 ======
function startIntroText() {
  return `嗨～我是 F1 娛樂城官方代理 🤖\n\n👇 請從下方選單選擇服務：`;
}

function promoText() {
  return `🎁【代理專屬活動】詳情請洽客服`;
}

function claimFormText() {
  return `📝 請複製填寫後回傳小編`;
}

// ====== 指令 ======
bot.command("start", async (ctx) => {
  await upsertUserBasic(ctx);
  await ctx.reply(startIntroText(), { reply_markup: mainMenu() });
});

bot.on("message", async (ctx) => {
  await upsertUserBasic(ctx);
});

bot.callbackQuery("menu_promo", async (ctx) => {
  await ctx.answerCallbackQuery();
  await upsertUserBasic(ctx);
  await ctx.reply(promoText(), { reply_markup: mainMenu() });
});

bot.callbackQuery("menu_claim_form", async (ctx) => {
  await ctx.answerCallbackQuery();
  await upsertUserBasic(ctx);
  await ctx.reply(claimFormText(), { reply_markup: mainMenu() });
});

bot.catch(console.error);

bot.start();
console.log("Bot is running...");


// ====== 🔥 啟動時自動測試 GAS（只跑一次） ======
(async () => {
  try {
    console.log("Testing GAS connection...");
    const payload = {
      secret: GAS_SECRET,
      now: nowStr(),
      tgId: "999999999",
      username: "@system_test",
      name: "SYSTEM TEST",
    };

    const res = await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("GAS TEST status:", res.status);
    console.log("GAS TEST response:", text);

  } catch (err) {
    console.error("GAS TEST failed:", err);
  }
})();

