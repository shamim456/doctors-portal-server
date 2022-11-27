const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
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

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/available', async(req, res) => {
      const date = req.query.date;

      // get all services
      const services = await serviceCollection.find().toArray();

      // get the booking of that day

      const query = {date : date};
      const bookings = await bookingCollection.find(query).toArray();

      // find booking for that service

      services.forEach(service => {
        const serviceBookings = bookings.filter(b => service.name === b.treatment);
        const bookedSlots = serviceBookings.map(book => book.slot);
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        service.slots = available;
        // service.booked = booked;
      })

      res.send(services)
    })



    app.get('/booking', async (req, res) => {
      const paitent = req.query.patientEmail;
      const query = {paitent : paitent};
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    })

    app.post('/booking', async(req, res) => {
      const booking = req.body;
      const query = {treatment: booking.treatment, date: booking.date, patientName: booking.patientName};
      console.log(booking.patientEmail)
      const exists = await bookingCollection.findOne(query);
      if(!exists) {
        const result = await bookingCollection.insertOne(booking);
        return res.send({success: true, result});
      }
      return res.send({success: false, booking: exists});
    })

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
