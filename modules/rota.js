const mongoose = require("./database");
const User = require("../models/users");
const Admin = require("../models/admins");

class Rota {
  constructor() {
    this.users = [];
    this.admins = ["bruno.campos"];
    this.time = "08:00";
    this.channelId = "";

    this.days = ["mon", "tue", "wed", "thu", "fri"];
  }

  async add(username, order) {
    if (username) {
      const userId = username.replace(/[<@|>]/g, "");
      const user = await User.findOne({ userId });

      if (!user) {
        let newOrder;
        if (order) {
          newOrder = parseInt(order, 10);
          // No need to update other users' orders in MongoDB
        } else {
          // Find the maximum order in the database
          const maxOrderUser = await User.findOne().sort("-order");
          newOrder = maxOrderUser ? maxOrderUser.order + 1 : 1;
        }

        const newUser = new User({ userId, order: newOrder, duty_days: 0 });
        await newUser.save();

        return `Added <@${userId}> to the rota.`;
      } else {
        return `<@${userId}> is already in the rota.`;
      }
    } else {
      return "Please specify a valid user.";
    }
  }

  async remove(username) {
    const userId = username.replace(/[<@|>]/g, "");
    const user = await User.findOneAndRemove({ userId });
    if (user) {
      return `Removed <@${userId}> from the rota.`;
    } else {
      return `<@${userId}> is not in the rota.`;
    }
  }

  async list() {
    let responseText = "";

    // List of users
    const users = await User.find();
    if (users.length === 0) {
      responseText += "The rota is currently empty.\n";
    } else {
      const userMentions = users.map(
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

  async getCurrentUser() {
    if (this.users.length === 0) {
      return "No one is on duty today.";
    }

    const user = await User.findOne().sort("order");

    if (!user) {
      return "No one is on duty today.";
    }

    user.duty_days++;
    const maxOrderUser = await User.findOne().sort("-order");
    user.order = maxOrderUser.order + 1;

    await user.save();

    return `Today's duty is on <@${user.userId}>.`;
  }

  async changeOrder(username, newOrder) {
    const userId = username.replace(/[<@|>]/g, "");
    const user = await User.findOne({ userId });
    const newOrderInt = parseInt(newOrder, 10);

    if (user) {
      user.order = newOrderInt;
      await user.save();

      return `Changed <@${userId}>'s order to ${newOrderInt}.`;
    } else {
      return `<@${userId}> is not in the rota.`;
    }
  }

  async reset() {
    const users = await User.find();

    for (const user of users) {
      user.duty_days = 0;
      await user.save();
    }

    return "All duty day counters have been reset.";
  }

  async addAdmin(username) {
    if (username) {
      const userId = username.replace(/[<@|>]/g, "");
      const admin = await Admin.findOne({ userId });

      if (!admin) {
        const newAdmin = new Admin({ userId });
        await newAdmin.save();

        return `Added <@${userId}> as an admin.`;
      } else {
        return `<@${userId}> is already an admin.`;
      }
    } else {
      return "Please specify a valid user.";
    }
  }

  async removeAdmin(username) {
    const userId = username.replace(/[<@|>]/g, "");
    const admin = await Admin.findOneAndRemove({ userId });
    if (admin) {
      return `Removed <@${userId}> from the admin list.`;
    } else {
      return `<@${userId}> is not an admin.`;
    }
  }

  async listAdmins() {
    const admins = await Admin.find();
    if (admins.length === 0) {
      return "The admin list is currently empty.";
    } else {
      const adminMentions = admins.map((admin) => `<@${admin.userId}>`);
      return `Admins: ${adminMentions.join(", ")}`;
    }
  }

  async isAdmin(username) {
    const userId = username.replace(/[<@|>]/g, "");
    const admin = await Admin.findOne({ userId });
    return admin !== null;
  }

  async setTime(time) {
    this.time = time;
    return `Announcement time has been set to ${time}.`;
  }

  async setDays(days) {
    this.days = days.split(",");
    return `Active days have been set to ${this.days.join(", ")}.`;
  }

  async setChannel(channelId) {
    this.channelId = channelId;
    return `Channel has been set to <#${channelId}>.`;
  }
}

module.exports = Rota;
