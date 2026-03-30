require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connect } = require("./db");
const router = require("./Routes/index");
const port = process.env.PORT || 5000;

const app = express()

app.use(cors())
// Using built-in express parsers instead of body-parser
app.use(express.json({limit: "50mb"}))
app.use(express.urlencoded({extended: true, limit: "50mb"}))

app.get('/', (req, res) => {
    res.send("hello this is internshala backend")
})

app.use("/api", router);
connect();

app.use((req, res, next) => {
    req.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Origin", "*")
    next()
})

app.listen(port, () => {
    console.log(`Server is running on the port ${port}`)
})
