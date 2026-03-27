const mongoose = require("mongoose");
require("dotenv").config();
database_url = process.env.DATABASE_URL;
const url = database_url;

module.exports.connect = () => {
    mongoose.connect(url, console.log("Connected to MongoDB"));
}