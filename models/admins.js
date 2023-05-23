const mongoose = require('mongoose')

const AdminSchema = new mongoose.Schema({
  adminId: String
})

module.exports = mongoose.model('Admin', AdminSchema)
