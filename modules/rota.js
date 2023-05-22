const fs = require("fs");
const csvParser = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

class Rota {
  constructor() {
    this.users = [];
    this.time = "08:00";
    this.csvWriter = createCsvWriter({
      path: "storage/users.csv",
      header: [
        { id: "userId", title: "userId" },
        { id: "duty_days", title: "duty_days" },
      ],
    });
    try {
      this.days = require("./storage/schedule.json").days || [
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
      ];
    } catch (error) {
      this.days = ["mon", "tue", "wed", "thu", "fri"];
    }
  }

  add(username, order) {
    if (username) {
      const userId = username.replace(/[<@|>]/g, "");
      const user = this.users.find((user) => user.userId === userId);

      if (!user) {
        let newOrder;
        if (order) {
          newOrder = parseInt(order, 10);
          this.users.forEach((user) => {
            if (user.order >= newOrder) {
              user.order++;
            }
          });
        } else {
          // If no order is specified, the user is added to the end of the list
          newOrder = this.users.length + 1;
        }

        this.users.push({ userId, order: newOrder, duty_days: 0 });
        this.save();

        return `Added <@${userId}> to the rota.`;
      } else {
        return `<@${userId}> is already in the rota.`;
      }
    } else {
      return "Please specify a valid user.";
    }
  }

  remove(username) {
    const userId = username.replace(/[<@|>]/g, "");
    const userIndex = this.users.findIndex((user) => user.userId === userId);
    if (userIndex > -1) {
      const removedUser = this.users.splice(userIndex, 1)[0];
      this.save();
      return `Removed <@${userId}> from the rota.`;
    } else {
      return `<@${userId}> is not in the rota.`;
    }
  }

  list() {
    let responseText = "";

    // List of users
    if (this.users.length === 0) {
      responseText += "The rota is currently empty.\n";
    } else {
      const userMentions = this.users.map(
        (user) => `<@${user.userId}> (${user.order})`
      );
      responseText += `> **Rota:** ${userMentions.join(", ")}\n`;
    }

    // Active days
    responseText += `> **Active days:** ${this.days.join(", ")}\n`;

    // Announcement time
    responseText += `> **Announcement time:** ${this.time}`;

    return responseText;
  }

  getCurrentUser() {
    if (this.users.length === 0) {
      return "No one is on duty today.";
    }

    // Sort the users by the number of duty days (ascending)
    const sortedUsers = [...this.users].sort((a, b) => a.order - b.order);

    // Select the first user in the sorted list (the user with the fewest duty days)
    const user = sortedUsers[0];

    // Increment the number of duty days for this user
    user.duty_days++;

    // Set this user's order to one more than the current maximum order value
    const maxOrder = Math.max(...this.users.map((user) => user.order));
    user.order = maxOrder + 1;

    // Save the updated user data
    this.save();

    return `Today's duty is on <@${user.userId}>.`;
  }

  changeOrder(username, newOrder) {
    const userId = username.replace(/[<@|>]/g, "");
    const user = this.users.find((user) => user.userId === userId);
    const newOrderInt = parseInt(newOrder, 10);

    if (user) {
      // if we found the user, increment the order of users with the same or higher order
      this.users.forEach((user) => {
        if (user.order >= newOrderInt) {
          user.order++;
        }
      });

      // then update the user's order
      user.order = newOrderInt;
      this.save();

      return `Changed <@${userId}>'s order to ${newOrder}.`;
    } else {
      return `<@${userId}> is not in the rota.`;
    }
  }

  reset() {
    for (const user of this.users) {
      user.duty_days = 0;
    }
    this.save();
  }

  setDays(daysString) {
    const daysArray = daysString
      .split(",")
      .map((day) => day.trim().toLowerCase());
    const validDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    // Validate that all input days are valid
    if (daysArray.some((day) => !validDays.includes(day))) {
      return "Please enter valid days (Mon, Tue, Wed, Thu, Fri, Sat, Sun).";
    }

    this.days = daysArray;
    this.save();

    return `Set rota days to: ${this.days.join(", ")}.`;
  }

  save() {
    const records = this.users.map((user) => ({
      userId: user.userId,
      order: user.order,
      duty_days: user.duty_days,
    }));

    // Update the csvWriter to include the "order" field
    this.csvWriter = createCsvWriter({
      path: "storage/users.csv",
      header: [
        { id: "userId", title: "userId" },
        { id: "duty_days", title: "duty_days" },
        { id: "order", title: "order" },
      ],
    });

    // Write the user records to the CSV file
    this.csvWriter.writeRecords(records);

    // Save days to schedule.json
    fs.writeFile(
      "./schedule.json",
      JSON.stringify({ days: this.days, time: this.time }),
      (error) => {
        if (error) {
          console.error("Failed to save schedule:", error);
        }
      }
    );
  }

  load() {
    return new Promise((resolve, reject) => {
      const users = [];
      fs.createReadStream("storage/users.csv")
        .pipe(csvParser())
        .on("data", (row) => {
          users.push({
            userId: row.userId,
            duty_days: Number(row.duty_days),
            order: Number(row.order),
          });
        })
        .on("end", () => {
          this.users = users;
          resolve();
        })
        .on("error", reject);
    });
  }

  loadSchedule() {
    return new Promise((resolve, reject) => {
      fs.readFile("schedule.json", (err, data) => {
        if (err) reject(err);
        else {
          const schedule = JSON.parse(data);
          this.days = schedule.days;
          this.time = schedule.time;
          resolve();
        }
      });
    });
  }
}

module.exports = Rota;
