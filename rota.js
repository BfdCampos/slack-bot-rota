const fs = require('fs')
const csvParser = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

class Rota {
  constructor () {
    this.users = []
    this.csvWriter = createCsvWriter({
      path: 'users.csv',
      header: [
        { id: 'username', title: 'username' },
        { id: 'duty_days', title: 'duty_days' }
      ]
    })
  }

  add (username) {
    const user = this.users.find((user) => user.username === username)
    if (!user) {
      this.users.push({ username, duty_days: 0 })
      return `Added ${username} to the rota.`
    } else {
      return `${username} is already in the rota.`
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

    return `Today's duty is on <@${user.username}>.`
  }

  reset () {
    for (const user of this.users) {
      user.duty_days = 0
    }
    this.save()
  }

  save () {
    return this.csvWriter.writeRecords(this.users)
  }

  load () {
    return new Promise((resolve, reject) => {
      const users = []
      fs.createReadStream('users.csv')
        .pipe(csvParser())
        .on('data', (row) => {
          users.push({
            username: row.username,
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
