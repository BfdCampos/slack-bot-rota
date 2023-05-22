const fs = require("fs");
const csvParser = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

class Rota {
  constructor() {
    this.users = [];
    this.csvWriter = createCsvWriter({
      path: "users.csv",
      header: [
        { id: "userId", title: "userId" },
        { id: "duty_days", title: "duty_days" },
      ],
    });
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
    if (this.users.length === 0) {
      return "The rota is currently empty.";
    } else {
      const userMentions = this.users.map((user) => `<@${user.userId}>`);
      return `Rota: ${userMentions.join(", ")}`;
    }
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

  save() {
    const records = this.users.map((user) => ({
      userId: user.userId,
      duty_days: user.duty_days,
      order: user.order,
    }));

    // Update the csvWriter to include the "order" field
    this.csvWriter = createCsvWriter({
      path: "users.csv",
      header: [
        { id: "userId", title: "userId" },
        { id: "duty_days", title: "duty_days" },
        { id: "order", title: "order" },
      ],
    });

    return this.csvWriter.writeRecords(records);
  }

  load() {
    return new Promise((resolve, reject) => {
      const users = [];
      fs.createReadStream("users.csv")
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
}

module.exports = Rota;
