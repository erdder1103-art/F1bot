import { Bot, InlineKeyboard } from "grammy";
import { insertLog } from "./db.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

const GAS_WEBAPP_URL = process.env.GAS_WEBAPP_URL;
const GAS_SECRET = process.env.GAS_SECRET;

if (!GAS_WEBAPP_URL) throw new Error("Missing GAS_WEBAPP_URL");
if (!GAS_SECRET) throw new Error("Missing GAS_SECRET");

const bot = new Bot(BOT_TOKEN);

// ====== 你的链接设置 ======
const URL_REGISTER = "https://s.f1.top/r?p=h2pEYZ5DDuYq";
const URL_CHANNEL = "https://t.me/livebigbrother1"; // 大师兄频道
const URL_GROUP = "https://t.me/livebigbrother"; // 大师兄群组
const URL_SUPPORT = "https://t.me/F1top_bro"; // 小编/客服

// ✅ 固定用台北时间（不靠 dayjs）
function nowStr() {
  const dtf = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return dtf.format(new Date()).replace(/\s/g, " ");
}

// 避免瞬间多次同时写入：做一个写入队列（很重要）
let writeQueue = Promise.resolve();
function enqueueWrite(fn) {
  writeQueue = writeQueue.then(fn).catch(() => {});
  return writeQueue;
}

// 🧠 安全写 DB：避免 db 出错害 bot 挂掉
function safeLog(action, message) {
  try {
    insertLog(action, String(message ?? ""));
  } catch (e) {
    console.error("SQLite log failed:", e?.message || e);
  }
}

// ✅ 上报（SQLite + GAS）：action 会一起送到 GAS
async function upsertUserBasic(ctx, action = "USER_UPSERT") {
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
        action,
      };

      // SQLite 本地 log（最稳）
      safeLog(action, JSON.stringify(payload));

      const res = await fetch(GAS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("GAS log failed:", res.status, t);
        safeLog("GAS_FAIL", `action=${action} status=${res.status} body=${t}`);
      } else {
        safeLog("GAS_OK", `tgId=${tgId} action=${action}`);
      }
    } catch (e) {
      console.error("GAS log error:", e?.message || e);
      safeLog("GAS_ERROR", e?.message || String(e));
    }
  });
}

// ====== 主菜单 ======
// ⚠️ 小编/客服 一定要 callback 才能记录「有点击」
function mainMenu() {
  return new InlineKeyboard()
    .url("✅ 注册账号", URL_REGISTER)
    .row()
    .url("📣 大师兄频道", URL_CHANNEL)
    .row()
    .url("👥 大师兄群组", URL_GROUP)
    .row()
    .text("🎁 活动内容", "menu_promo")
    .row()
    .text("📝 领取申请表单", "menu_claim_form")
    .row()
    .text("👨‍💻 小编/客服", "menu_support");
}

// ====== 文案（强销售・高吸引力版本）======
function startIntroText() {
  return (
    `🔥 限时福利来了！\n\n` +
    `我是 F1 娱乐城官方代理 🤖\n\n` +
    `🎁 现在加入立即送【10 USDT 体验金】\n` +
    `👉 免充值即可直接体验真实游戏！\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `📌 4 步快速领取\n` +
    `━━━━━━━━━━━━━━\n` +
    `① 注册账号并完成「钱包绑定」⚠（非常重要）\n` +
    `② 加入「大师兄频道」（需审核）\n` +
    `③ 填写「领取申请表单」\n` +
    `④ 联系小编提交申请\n\n` +
    `✅ 完成即可领取 10 USDT 体验金\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `💎 玩得到，也提得到\n` +
    `━━━━━━━━━━━━━━\n` +
    `🎮 电子游戏只需 5 倍流水\n` +
    `🎮 其他游戏 15 倍流水\n\n` +
    `💰 体验金最高可提现 50 USDT\n` +
    `（超过部分将调整为 50 USDT）\n\n` +
    `💳 提现方式简单：\n` +
    `充值 30 USDT，完成 1 倍流水即可提现\n\n` +
    `✨ 重点：充值后的盈利没有提现上限！\n\n` +
    `🌐 多元出入金通道：\n` +
    `虚拟货币 / 三方支付 / 全球货币 / 信用卡\n\n` +
    `⚡ 名额有限，错过就没有\n\n` +
    `👇 立即从下方菜单开始申请`
  );
}

function promoText() {
  return (
    `🎁【F1 娱乐城｜代理专属活动】🎁\n\n` +
    `🔥 首次充值优惠\n` +
    `━━━━━━━━━━━━━━\n` +
    `✔ 充值送彩金：30% ～ 50%\n` +
    `✔ 流水要求：5 ～ 7 倍\n` +
    `📩 想了解适合你的方案，请直接点「小编/客服」\n\n` +
    `💰 每日投注奖励（连续 7 天有效）\n` +
    `━━━━━━━━━━━━━━\n` +
    `说明：自会员「首存当日」起算，连续 7 天内有效\n\n` +
    `🔹 有效投注 ≥ 300 USDT\n` +
    `　🎁 奖励 8 USDT（5 倍流水）\n\n` +
    `🔹 有效投注 ≥ 800 USDT\n` +
    `　🎁 奖励 25 USDT（5 倍流水）\n\n` +
    `🔹 有效投注 ≥ 1500 USDT\n` +
    `　🎁 奖励 50 USDT（5 倍流水）\n\n` +
    `📌 需要协助请点「小编/客服」`
  );
}

// ✅ 只在这里新增「钱包绑定」题目，其它不动
function claimFormText() {
  return (
    `📝【领取申请表单】（请复制填写后回传小编）\n\n` +
    `1) 从什么渠道得知体验金？\n` +
    `   [脸书&IG广告 / TG广告 / Live直播 / 朋友介绍(朋友会员ID)]\n\n` +
    `2) 是否玩过存 USDT 的平台？\n` +
    `   请填平台名称（可加快审核），没有请填「无」\n\n` +
    `3) 我的会员账号：\n\n` +
    `4) 账户是否已完成钱包绑定？\n` +
    `   [已绑定 / 未绑定]\n\n` +
    `5) 是否知晓体验金规则？\n` +
    `   请回答「知道」或「不知道」\n\n` +
    `✅ 填写完成后：\n` +
    `请点「小编/客服」→ 粘贴以上内容提交即可。`
  );
}

// ✅ 启动时先测一次 GAS（不影响 bot）
async function testGAS() {
  try {
    console.log("Testing GAS connection...");
    const payload = {
      secret: GAS_SECRET,
      now: nowStr(),
      tgId: "999999999",
      username: "@system_test",
      name: "SYSTEM TEST",
      action: "GAS_TEST",
    };

    const res = await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const txt = await res.text().catch(() => "");
    console.log("GAS TEST status:", res.status);
    console.log("GAS TEST response:", txt);

    safeLog("GAS_TEST", `status=${res.status} body=${txt}`);
  } catch (e) {
    console.error("GAS TEST failed:", e?.message || e);
    safeLog("GAS_TEST_FAIL", e?.message || String(e));
  }
}

// /start
bot.command("start", async (ctx) => {
  await upsertUserBasic(ctx, "CMD_START");

  try {
    await ctx.reply(startIntroText(), { reply_markup: mainMenu() });
  } catch (e) {
    // 403: bot was blocked by the user 等等，不要让 bot 崩
    safeLog("SEND_FAIL", e?.description || e?.message || String(e));
  }
});

// 任何消息都更新最后互动时间
bot.on("message", async (ctx) => {
  await upsertUserBasic(ctx, "MESSAGE");
});

// 活动内容
bot.callbackQuery("menu_promo", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await upsertUserBasic(ctx, "CLICK_PROMO");

  try {
    await ctx.reply(promoText(), { reply_markup: mainMenu() });
  } catch (e) {
    safeLog("SEND_FAIL", e?.description || e?.message || String(e));
  }
});

// 领取申请表单
bot.callbackQuery("menu_claim_form", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await upsertUserBasic(ctx, "CLICK_FORM");

  try {
    await ctx.reply(claimFormText(), { reply_markup: mainMenu() });
  } catch (e) {
    safeLog("SEND_FAIL", e?.description || e?.message || String(e));
  }
});

// ✅ 小编/客服（只要按到这颗，就一定记录到 CLICK_SUPPORT）
bot.callbackQuery("menu_support", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});

  // 先本地落一笔：保证「有按」一定存在
  try {
    safeLog("CLICK_SUPPORT", `tgId=${String(ctx.from?.id ?? "")} now=${nowStr()}`);
  } catch {}

  // 再送 GAS（action=CLICK_SUPPORT）
  await upsertUserBasic(ctx, "CLICK_SUPPORT");

  // 回传一个可点的客服链接（注意：点 URL Telegram 不会再回传事件，这是 TG 限制）
  const kb = new InlineKeyboard().url("👨‍💻 前往小编/客服", URL_SUPPORT);

  try {
    await ctx.reply("已为你打开客服入口，请点下面按钮联系小编 👇", { reply_markup: kb });
  } catch (e) {
    safeLog("SEND_FAIL", e?.description || e?.message || String(e));
  }
});

// 重大错误捕捉
bot.catch((err) => {
  console.error("BOT ERROR:", err);
  safeLog("BOT_ERROR", err?.message || String(err));
});

// 启动流程
safeLog("SYSTEM", "Booting bot...");
await testGAS();
safeLog("SYSTEM", "Bot started");

bot.start();
console.log("Bot is running...");
