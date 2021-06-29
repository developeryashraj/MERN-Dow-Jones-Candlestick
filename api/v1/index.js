var express = require("express");
var router = express.Router();
var dateUtil = require("../../utils/date");
// import getDateRangeOfWeek from "../../utils/date";

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

  const formatedFromDate = new Date(fromDate);
  const formatedToDate = new Date(toDate);
  if (formatedFromDate > formatedToDate) {
    res.send({
      status: 2,
      message: "From date can not be higher then To date",
    });
  }

  const query = {
    Date: { $gte: formatedFromDate, $lte: formatedToDate },
  };
  const options = {
    sort: { Date: 1, _id: 1 },
  };

  const data = await historicalPricesCollection
    .find(query, options)
    .skip(pageNumber > 0 ? (pageNumber - 1) * limit : 0)
    .limit(limit)
    .toArray();

  res.send({ status: 1, data: data });
});

router.post("/weeklyCandleData", async function (req, res, next) {
  const { year = "", weekNumber = "", runWithMongoOnly = true } = req.body;

  if (!year) {
    res.send({ status: 2, message: "Please enter a year" });
  }
  if (!weekNumber) {
    res.send({
      status: 2,
      message: "Please enter a Week of the year (max 53)",
    });
  }
  if (weekNumber > 53) {
    res.send({
      status: 2,
      message: "Years can have max 53 weeks. Lower your week number",
    });
  }

  const { rangeIsFrom: fromDate, rangeIsTo: toDate } =
    dateUtil.getDateRangeOfWeek(weekNumber, year);

  // res.send({ fromDate, toDate });
  const formatedFromDate = new Date(fromDate);
  const formatedToDate = new Date(toDate);

  if (runWithMongoOnly) {
    // This is the mongo way
    const aggr = [
      {
        $match: {
          Date: {
            $gte: formatedFromDate,
            $lte: formatedToDate,
          },
        },
      },
      {
        $sort: {
          Date: 1,
          _id: 1,
        },
      },
      {
        $group: {
          _id: null,
          openValue: {
            $first: "$Open",
          },
          closeValue: {
            $last: "$Close",
          },
          highValue: {
            $max: "$High",
          },
          lowValue: {
            $min: "$Low",
          },
        },
      },
    ];

    const data = await historicalPricesCollection.aggregate(aggr).toArray();
    const dataJSON = data && data.length > 0 && data[0];
    delete dataJSON["_id"];
    const response = {
      fromDate: fromDate,
      toDate: toDate,
      ...data[0],
    };
    res.send({ status: 1, data: response });
  } else {
    // Normal Vanilla way
    const query = {
      Date: { $gte: formatedFromDate, $lte: formatedToDate },
    };
    const options = {
      sort: { Date: 1, _id: 1 },
    };

    const data = await historicalPricesCollection
      .find(query, options)
      .toArray();

    const response = {
      fromDate: fromDate,
      toDate: toDate,
      openValue: "",
      closeValue: "",
      highValue: "",
      lowValue: "",
      data: data,
    };

    data.map((item, index) => {
      if (index === 0) {
        response.openValue = item.Open;
      }

      if (index === data.length - 1) {
        response.closeValue = item.Close;
      }
      response.highValue =
        response.highValue === "" || item.High > response.highValue
          ? item.High
          : response.highValue;
      response.lowValue =
        response.lowValue === "" || item.Low < response.lowValue
          ? item.Low
          : response.lowValue;
    });

    res.send({ status: 1, data: response });
  }
});

module.exports = router;
