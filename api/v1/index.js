var express = require("express");
var router = express.Router();

var MongoClient = require("mongodb").MongoClient;
var historicalPricesCollection = "";
MongoClient.connect(
  "mongodb://localhost:27017/DowJones",
  function (err, client) {
    if (err) throw err;

    db = client.db("DowJones");
    historicalPricesCollection = db.collection("HistoricalPrices");
  }
);

router.use(function (req, res, next) {
  if (
    req.get("api-key") === "testing-key" &&
    req.get("auth-token") === "test-token"
  ) {
    next();
  } else {
    res.send({ status: 0, message: "You are not authorize to use this api" });
  }
});

router.post("/dailyCandleData", async function (req, res, next) {
  const { fromDate = "", toDate = "", limit = 100, pageNumber = 1 } = req.body;

  if (!fromDate || !toDate) {
    res.send({ status: 2, message: "Please enter a valid date range" });
  }
  if (fromDate > toDate) {
    res.send({ status: 2, message: "From date can not be higer then To date" });
  }

  const query = {
    Date: { $gte: fromDate, $lt: toDate },
  };
  const options = {
    sort: { Date: 1, _id: 1 },
  };

  const data = await historicalPricesCollection
    .find(query, options)
    .skip(pageNumber > 0 ? (pageNumber - 1) * limit : 0)
    .limit(limit)
    .toArray();

  res.send(data);
});

module.exports = router;
