const mongoose = require('mongoose')

const ScheduleSchema = new mongoose.Schema({
  days: [String],
  time: String,
  channelId: String
})

module.exports = mongoose.model('Schedule', ScheduleSchema)
