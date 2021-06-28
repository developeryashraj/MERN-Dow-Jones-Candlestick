var express = require("express");
var router = express.Router();
var api = require("../api");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.use("/api", function (req, res, next) {
  // validate api specific things here
  next();
});
module.exports = router;
