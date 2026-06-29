require("dotenv").config();
const express = require("express");
const app = express();
const PORT = 8080;
const http = require("http").createServer(app);
const bodyParser = require("body-parser");
const cors = require("cors");
const sequelize = require("./config/db");
const orderRoute = require('./routes/orderRoute');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res, next) => {
  res.send("Hello world");
  next();
});

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create table : ", err);
  });

app.use("/api/v1/order", orderRoute);

const listen = http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
