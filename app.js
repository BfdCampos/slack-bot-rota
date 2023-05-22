require('dotenv').config()

const { App, LogLevel, SocketModeReceiver } = require('@slack/bolt')
const fs = require('fs')
const csvParser = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: new SocketModeReceiver({
    appToken: process.env.SLACK_APP_TOKEN
  }),
  logLevel: LogLevel.DEBUG
})

app.message('hello', async ({ message, say }) => {
  await say(`Hello <@${message.user}>`)
})

// app.js

class Rota {
  constructor () {
    this.users = []
    this.csvWriter = createCsvWriter({
      path: 'users.csv',
      header: [{ id: 'username', title: 'username' }]
    })
  }

  add (user) {
    if (!this.users.includes(user)) {
      this.users.push(user)
      return `Added ${user} to the rota.`
    } else {
      return `${user} is already in the rota.`
    }
  }

  remove (user) {
    const index = this.users.indexOf(user)
    if (index > -1) {
      this.users.splice(index, 1)
      return `Removed ${user} from the rota.`
    } else {
      return `${user} is not in the rota.`
    }
  }

  list () {
    if (this.users.length === 0) {
      return 'The rota is currently empty.'
    } else {
      return `Rota: ${this.users.join(', ')}`
    }
  }

  getCurrentUser () {
    if (this.users.length === 0) {
      return 'No one is on duty today.'
    }
    const today = new Date()
    const index = today.getDate() % this.users.length
    return `Today's duty is on ${this.users[index]}.`
  }

  save () {
    const records = this.users.map((username) => ({ username }))
    return this.csvWriter.writeRecords(records)
  }

  load () {
    return new Promise((resolve, reject) => {
      const users = []
      fs.createReadStream('users.csv')
        .pipe(csvParser())
        .on('data', (row) => {
          users.push(row.username)
        })
        .on('end', () => {
          this.users = users
          resolve()
        })
        .on('error', reject)
    })
  }
}

const rota = new Rota();

(async () => {
  await rota.load()
  await app.start()
  console.log('⚡️ Bolt app is running!')
})()

fs.createReadStream('users.csv')
  .pipe(csvParser())
  .on('data', (row) => {
    rota.add(row.username)
  })
  .on('end', () => {
    console.log('CSV file successfully processed')
  })

app.command('/test_announce_rota', async ({ command, ack, respond }) => {
  // Acknowledge command request
  await ack()

  try {
    await announceRota(command.channel_id)
    await respond('Announcement sent!')
  } catch (error) {
    await respond(`Failed to send announcement: ${error.message}`)
  }
})

app.command('/rota', async ({ command, ack, respond }) => {
  await ack()

  // Parse the text of the command to determine what action to take
  const action = command.text.split(' ')[0]
  const user = command.text.split(' ')[1]

  let responseText = ''

  if (action === 'add') {
    responseText = rota.add(user)
    await rota.save()
  } else if (action === 'remove') {
    responseText = rota.remove(user)
    await rota.save()
  } else if (action === 'list') {
    responseText = rota.list()
  } else {
    responseText =
      "Sorry, I don't understand that command. Try /rota add @user, /rota remove @user, or /rota list."
  }

  await respond({ text: responseText })
})

// Send the current rota user to a channel every day at a specific time
function scheduleRotaAnnouncement (channelId) {
  // Calculate time until next announcement
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(13, 56, 0, 0) // 9 AM
  const msUntilTomorrow = tomorrow - now

  // Schedule first announcement
  setTimeout(() => {
    announceRota(channelId)

    // Schedule all following announcements
    setInterval(() => {
      announceRota(channelId)
    }, 24 * 60 * 60 * 1000) // Every 24 hours
  }, msUntilTomorrow)
}

// Send a message to a channel with the current rota user
async function announceRota (channelId) {
  try {
    console.log('Trying to announce rota...')
    // Use chat.postMessage method to send a message from your app
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: rota.getCurrentUser()
    })
    console.log('Rota announced:', result)
  } catch (error) {
    console.error('Error announcing rota:', error)
  }
}

// Start the announcement schedule
scheduleRotaAnnouncement('C058NGRG4ES')
