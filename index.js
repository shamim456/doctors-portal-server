const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l2yhyrs.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if(err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();

    // service database collections
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");

    // booking database collections
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");

    // user database collections
    const userCollection = client.db("doctors_portal").collection("users ");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // get all services
      const services = await serviceCollection.find().toArray();

      // get the booking of that day

      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // find booking for that service

      services.forEach((service) => {
        const serviceBookings = bookings.filter(
          (b) => service.name === b.treatment
        );
        const bookedSlots = serviceBookings.map((book) => book.slot);
        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        service.slots = available;
        // service.booked = booked;
      });

      res.send(services);
    });

    app.get("/booking", verifyJWT, async (req, res) => {
      const paitent = req.query.patientEmail;
      // console.log(paitent)
      const decodedEmail = req.decoded.email;
      if(paitent === decodedEmail) {
        const authorization = req.headers.authorization;
      console.log("auth", authorization);
      const query = { patientEmail: paitent };
      const bookings = await bookingCollection.find(query).toArray();
      return res.send(bookings);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patientName: booking.patientName,
      };
      console.log(booking.patientEmail);
      const exists = await bookingCollection.findOne(query);
      if (!exists) {
        const result = await bookingCollection.insertOne(booking);
        return res.send({ success: true, result });
      }
      return res.send({ success: false, booking: exists });
    });


    app.get('/user', verifyJWT, async(req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello shamim");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
