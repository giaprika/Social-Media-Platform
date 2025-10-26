const Users = require("./user.model");

module.exports = {
  findById: (id) => Users.findById(id),
  findByEmail: (email) => Users.findOne({ email }),
  create: (data) => new Users(data).save(),
  updateById: (id, data) => Users.findByIdAndUpdate(id, data, { new: true }),
  model: Users,
};
