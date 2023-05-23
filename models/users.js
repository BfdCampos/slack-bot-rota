const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  userId: String,
  duty_days: Number,
  order: Number
})

module.exports = mongoose.model('User', UserSchema)
