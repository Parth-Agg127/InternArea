const mongoose = require("mongoose");
require("dotenv").config();

const url = process.env.DATABASE_URL;

module.exports.connect = async () => {
    if (!url) {
        throw new Error("DATABASE_URL not set");
    }

    try {
        await mongoose.connect(url);
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("Mongo connection error:", err.message);
        throw err;
    }
};