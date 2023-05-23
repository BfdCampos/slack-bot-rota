const fs = require('fs')
const csvParser = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

class Rota {
  constructor () {
    this.users = []
    this.admins = ['bruno.campos']
    this.time = '08:00'
    this.channelId = ''
    this.csvWriter = createCsvWriter({
      path: 'storage/users.csv',
      header: [
        { id: 'userId', title: 'userId' },
        { id: 'duty_days', title: 'duty_days' }
      ]
    })
    try {
      this.days = require('./storage/schedule.json').days || [
        'mon',
        'tue',
        'wed',
        'thu',
        'fri'
      ]
    } catch (error) {
      this.days = ['mon', 'tue', 'wed', 'thu', 'fri']
    }
  }

  add (username, order) {
    if (username) {
      const userId = username.replace(/[<@|>]/g, '')
      const user = this.users.find((user) => user.userId === userId)

      if (!user) {
        let newOrder
        if (order) {
          newOrder = Math.min(parseInt(order, 10), this.users.length + 1)
          this.users.forEach((user) => {
            if (user.order >= newOrder) {
              user.order++
            }
          })
        } else {
          // If no order is specified, the user is added to the end of the list
          newOrder = this.users.length + 1
        }

        this.users.push({ userId, order: newOrder, duty_days: 0 })
        this.save()

        return `Added <@${userId}> to the rota.`
      } else {
        return `<@${userId}> is already in the rota.`
      }
    } else {
      return 'Please specify a valid user.'
    }
  }

  remove (username) {
    const userId = username.replace(/[<@|>]/g, '')
    const userIndex = this.users.findIndex((user) => user.userId === userId)
    if (userIndex > -1) {
      const removedUser = this.users.splice(userIndex, 1)[0]
      this.save()
      return `Removed <@${userId}> from the rota.`
    } else {
      return `<@${userId}> is not in the rota.`
    }
  }

  list () {
    let responseText = ''

    // List of users
    if (this.users.length === 0) {
      responseText += 'The rota is currently empty.\n'
    } else {
      const userMentions = this.users.map(
        (user) => `<@${user.userId}> (${user.order})`
      )
      responseText += `> **Rota:** ${userMentions.join(', ')}\n`
    }

    // Active days
    responseText += `> **Active days:** ${this.days.join(', ')}\n`

    // Announcement time
    responseText += `> **Announcement time:** ${this.time}`

    return responseText
  }

  getCurrentUser () {
    if (this.users.length === 0) {
      return 'No one is on duty today.'
    }

    // Sort the users by their order value (ascending)
    const sortedUsers = [...this.users].sort((a, b) => a.order - b.order)

    // Select the user with the minimum order value (the first user in the sorted list)
    const currentUser = sortedUsers[0]

    // Rotate the order of users in the rota
    for (const user of this.users) {
      if (user.order === currentUser.order) {
        user.order = this.users.length
      } else if (user.order > currentUser.order) {
        user.order--
      }
    }

    // Save the updated user data
    this.save()

    return `Today's duty is on <@${currentUser.userId}>.`
  }

  changeOrder (username, newOrder) {
    const userId = username.replace(/[<@|>]/g, '')
    const user = this.users.find((user) => user.userId === userId)
    const newOrderInt = Math.min(parseInt(newOrder, 10), this.users.length)

    if (user) {
      this.users.forEach((otherUser) => {
        if (
          otherUser.userId !== user.userId &&
          otherUser.order >= newOrderInt
        ) {
          otherUser.order--
        }
      })

      user.order = newOrderInt
      this.save()

      return `Changed <@${userId}>'s order to ${newOrderInt}.`
    } else {
      return `<@${userId}> is not in the rota.`
    }
  }

  reset () {
    for (const user of this.users) {
      user.duty_days = 0
    }
    this.save()
  }

  setDays (daysString) {
    const daysArray = daysString
      .split(',')
      .map((day) => day.trim().toLowerCase())
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

    // Validate that all input days are valid
    if (daysArray.some((day) => !validDays.includes(day))) {
      return 'Please enter valid days (Mon, Tue, Wed, Thu, Fri, Sat, Sun).'
    }

    this.days = daysArray
    this.save()

    return `Set rota days to: ${this.days.join(', ')}.`
  }

  setTime (timeString) {
    const time = timeString.trim()
    // check if time is valid
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return 'Invalid time format. Please use HH:mm format.'
    }

    this.time = time
    this.save()

    return `Set announcement time to: ${this.time}.`
  }

  save () {
    const records = this.users.map((user) => ({
      userId: user.userId,
      order: user.order,
      duty_days: user.duty_days
    }))

    // Update the csvWriter to include the "order" field
    this.csvWriter = createCsvWriter({
      path: 'storage/users.csv',
      header: [
        { id: 'userId', title: 'userId' },
        { id: 'duty_days', title: 'duty_days' },
        { id: 'order', title: 'order' }
      ]
    })

    // Write the user records to the CSV file
    this.csvWriter.writeRecords(records)

    // Save days to storage/schedule.json
    fs.writeFile(
      './storage/schedule.json',
      JSON.stringify({
        days: this.days,
        time: this.time,
        channelId: this.channelId
      }),
      (error) => {
        if (error) {
          console.error('Failed to save schedule:', error)
        }
      }
    )
  }

  load () {
    return new Promise((resolve, reject) => {
      const users = []
      fs.createReadStream('storage/users.csv')
        .pipe(csvParser())
        .on('data', (row) => {
          users.push({
            userId: row.userId,
            duty_days: Number(row.duty_days),
            order: Number(row.order)
          })
        })
        .on('end', () => {
          this.users = users
          resolve()
        })
        .on('error', reject)
    })
  }

  async loadSchedule () {
    const scheduleFileContent = await fs.promises.readFile(
      './storage/schedule.json',
      'utf-8'
    )
    const schedule = JSON.parse(scheduleFileContent)
    this.time = schedule.time
    this.days = schedule.days
    this.channelId = schedule.channelId
  }

  addAdmin (userId) {
    // load current admins
    const admins = this.loadAdmins()

    if (!admins.includes(userId)) {
      admins.push(userId)
      this.saveAdmins(admins)
      return `<@${userId}> is now a rota admin.`
    } else {
      return `<@${userId}> is already a rota admin.`
    }
  }

  removeAdmin (userId) {
    // load current admins
    const admins = this.loadAdmins()
    const index = admins.indexOf(userId)

    if (index > -1) {
      admins.splice(index, 1)
      this.saveAdmins(admins)
      return `<@${userId}> is no longer a rota admin.`
    } else {
      return `<@${userId}> is not a rota admin.`
    }
  }

  listAdmins () {
    const admins = this.loadAdmins()
    if (admins.length === 0) {
      return 'There are currently no rota admins.'
    } else {
      const adminMentions = admins.map((userId) => `<@${userId}>`)
      return `Rota Admins: ${adminMentions.join(', ')}`
    }
  }

  loadAdmins () {
    let admins
    try {
      admins = JSON.parse(fs.readFileSync('./storage/admins.json'))
    } catch (error) {
      admins = []
    }
    return admins
  }

  saveAdmins (admins) {
    fs.writeFileSync('./storage/admins.json', JSON.stringify(admins))
  }

  isAdmin (userId) {
    const admins = this.loadAdmins()
    return admins.includes(userId)
  }
}

module.exports = Rota
