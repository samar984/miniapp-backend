const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const MONGO_URI = process.env.MONGO_URI;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

mongoose.connect(MONGO_URI)
.then(()=> console.log("MongoDB Connected"))
.catch(err=> console.log(err));

const userSchema = new mongoose.Schema({
  telegramId: String,
  balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);

bot.onText(/\/start/, async (msg) => {
  const telegramId = msg.from.id.toString();
  let user = await User.findOne({ telegramId });
  if (!user) await User.create({ telegramId });

  bot.sendMessage(msg.chat.id, "Welcome! Proof yahi bheje.");
});

bot.onText(/\/add (\d+) (\d+)/, async (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;

  const userId = match[1];
  const amount = parseInt(match[2]);

  await User.updateOne(
    { telegramId: userId },
    { $inc: { balance: amount } }
  );

  bot.sendMessage(msg.chat.id, "Balance Added");
});

app.get("/get-balance/:id", async (req, res) => {
  const user = await User.findOne({ telegramId: req.params.id });
  if (!user) return res.json({ balance: 0 });

  res.json({ balance: user.balance });
});

app.post("/withdraw", async (req, res) => {
  const { userId } = req.body;

  const user = await User.findOne({ telegramId: userId });
  if (!user || user.balance <= 0)
    return res.json({ success: false });

  bot.sendMessage(
    ADMIN_ID,
    `New Withdrawal Request\nUser: ${userId}\nAmount: ₹${user.balance}`
  );

  user.balance = 0;
  await user.save();

  res.json({ success: true });
});

app.listen(3000, () => console.log("Server Running"));
