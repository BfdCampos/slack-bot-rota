require("dotenv").config();

const { App, LogLevel, SocketModeReceiver } = require("@slack/bolt");
const fs = require("fs");
const csvParser = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const cron = require("node-cron");
const bodyParser = require("body-parser");

const Rota = require("./modules/rota");
require("./modules/database");

cron.schedule("* * * * *", () => {
  console.log("running a task every minute");
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: new SocketModeReceiver({
    appToken: process.env.SLACK_APP_TOKEN,
  }),
  logLevel: LogLevel.DEBUG,
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.message("hello", async ({ message, say }) => {
  await say(`Hello <@${message.user}>`);
});

const rota = new Rota();

(async () => {
  await rota.load();
  await rota.loadSchedule();
  rota.addAdmin("U022D1F2XTR");

  const [hour, minute] = rota.time.split(":");
  const daysMapping = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  const daysInCronFormat = rota.days.map((day) => daysMapping[day]).join(",");

  const cronTime = `${minute} ${hour} * * ${daysInCronFormat}`;
  console.log("Cron time:", cronTime);

  cron.schedule(cronTime, async () => {
    // This will run every day at the specified time
    const message = rota.getCurrentUser();
    try {
      // Use chat.postMessage method to send a message from your app
      const result = await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: rota.channelId,
        text: message,
      });
      console.log("Rota announced:", result);
    } catch (error) {
      console.error("Error announcing rota:", error);
    }
  });

  await app.start();
  console.log("⚡️ Bolt app is running!");
})();

app.command("/test_announce_rota", async ({ command, ack, respond }) => {
  // Acknowledge command request
  await ack();

  try {
    await announceRota(command.channel_id);
    await respond("Announcement sent!");
  } catch (error) {
    await respond(`Failed to send announcement: ${error.message}`);
  }
});

app.command("/rota", async ({ command, ack, respond }) => {
  await ack();
  // Parse the text of the command to determine what action to take
  const parts = command.text.split(" ");
  const action = command.text.split(" ")[0];
  const username = command.text.split(" ")[1];
  const order = command.text.split(" ")[2];

  if (action === "admin") {
    const subAction = parts[1];
    const username = parts[2];
    const userId = username.replace(/[<@|>]/g, "");

    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "You do not have permission to perform this action.",
      });
    }

    let responseText = "";
    if (subAction === "add") {
      responseText = rota.addAdmin(userId);
    } else if (subAction === "remove") {
      responseText = rota.removeAdmin(userId);
    } else if (subAction === "list") {
      responseText = rota.listAdmins();
    } else {
      responseText =
        "Invalid command. Use /rota admin add @user, /rota admin remove @user, or /rota admin list.";
    }

    await respond({ text: responseText });
  }

  let responseText = "";

  if (action === "add") {
    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "Only rota admins can modify the rota.",
      });
    }
    responseText = rota.add(username, order);
    await rota.save();
  } else if (action === "remove") {
    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "Only rota admins can modify the rota.",
      });
    }
    responseText = rota.remove(username);
    await rota.save();
  } else if (action === "list") {
    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "Only rota admins can modify the rota.",
      });
    }
    responseText = rota.list();
  } else if (action === "change_order") {
    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "Only rota admins can modify the rota.",
      });
    }
    responseText = rota.changeOrder(username, order);
  } else if (action === "set_days") {
    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "Only rota admins can modify the rota.",
      });
    }
    const days = command.text.split(" ")[1];
    if (days) {
      responseText = rota.setDays(days);
    } else {
      responseText = "Please specify the days for the rota.";
    }
  } else if (action === "set_time") {
    if (!rota.isAdmin(command.user_id)) {
      return await respond({
        text: "Only rota admins can modify the rota.",
      });
    }
    const time = command.text.split(" ")[1];
    if (time) {
      responseText = rota.setTime(time);
    } else {
      responseText = "Please specify the time for the rota.";
    }
  } else if (action === "admin") {
    console.log("admin command");
  } else {
    responseText =
      "Sorry, I don't understand that command. Try /rota add @user, /rota remove @user, or /rota list.";
  }

  await respond({ text: responseText });
});

// Send a message to a channel with the current rota user
async function announceRota(channelId) {
  try {
    console.log("Trying to announce rota...");
    // Use chat.postMessage method to send a message from your app
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: rota.getCurrentUser(),
    });
    console.log("Rota announced:", result);
  } catch (error) {
    console.error("Error announcing rota:", error);
  }
}

module.exports = app;
