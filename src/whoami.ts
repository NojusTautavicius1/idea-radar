import fs from "node:fs";

// Setup helper: send any message to your bot, then run `npm run whoami` to see the chat id to use as TELEGRAM_CHAT_ID.
if (fs.existsSync(".env")) process.loadEnvFile(".env");
const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`);
const { result } = (await res.json()) as { result: { message?: { chat: { id: number; first_name?: string } } }[] };
const chats = new Map(result.flatMap((u) => (u.message ? [[u.message.chat.id, u.message.chat.first_name ?? ""]] : [])));
if (chats.size === 0) console.log("No messages yet: open your bot in Telegram, press Start, then run this again.");
for (const [id, name] of chats) console.log(`TELEGRAM_CHAT_ID=${id}  (${name})`);
