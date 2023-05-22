const fs = require('fs')
const csvParser = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

class Rota {
  constructor () {
    this.users = []
    this.csvWriter = createCsvWriter({
      path: 'users.csv',
      header: [
        { id: 'userId', title: 'userId' },
        { id: 'duty_days', title: 'duty_days' }
      ]
    })
  }

  add (username) {
    if (username) {
      const userId = username.replace(/[<@|>]/g, '')
      const user = this.users.find((user) => user.userId === userId)
      if (!user) {
        this.users.push({ userId, duty_days: 0 })
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
    const index = this.users.indexOf(userId)
    if (index > -1) {
      const removedUser = this.users.splice(index, 1)[0]
      this.save()
      return `Removed <@${userId}> from the rota.`
    } else {
      return `<@${userId}> is not in the rota.`
    }
  }

  list () {
    if (this.users.length === 0) {
      return 'The rota is currently empty.'
    } else {
      const userMentions = this.users.map((user) => `${user.userId}`)
      return `Rota: ${userMentions.join(', ')}`
    }
  }

  getCurrentUser () {
    if (this.users.length === 0) {
      return 'No one is on duty today.'
    }

    // Sort the users by the number of duty days (ascending)
    const sortedUsers = [...this.users].sort(
      (a, b) => a.duty_days - b.duty_days
    )

    // Select the first user in the sorted list (the user with the fewest duty days)
    const user = sortedUsers[0]

    // Increment the number of duty days for this user
    user.duty_days++

    // Save the updated user data
    this.save()

    return `Today's duty is on <@${user.userId}>.`
  }

  reset () {
    for (const user of this.users) {
      user.duty_days = 0
    }
    this.save()
  }

  save () {
    const records = this.users.map((user) => ({
      userId: user.userId,
      duty_days: user.duty_days
    }))
    return this.csvWriter.writeRecords(this.users)
  }

  load () {
    return new Promise((resolve, reject) => {
      const users = []
      fs.createReadStream('users.csv')
        .pipe(csvParser())
        .on('data', (row) => {
          users.push({
            userId: row.userId,
            duty_days: Number(row.duty_days)
          })
        })
        .on('end', () => {
          this.users = users
          resolve()
        })
        .on('error', reject)
    })
  }
}

module.exports = Rota
