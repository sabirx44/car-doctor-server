const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eyvufda.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();

    // Get collections
    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');

    // Get all services
    app.get('/services', async (req, res) => {
      try {
        const services = await serviceCollection.find().toArray();
        res.send(services);
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve services' });
      }
    });

    // Get a specific service by ID
    app.get('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const service = await serviceCollection.findOne({ _id: new ObjectId(id) }, {
          projection: { service_id: 1, title: 1, img: 1, price: 1 }
        });
        if (service) {
          res.send(service);
        } else {
          res.status(404).send({ message: "Service not found" });
        }
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve service' });
      }
    });

    // Create a new booking
    app.post('/bookings', async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to create booking' });
      }
    });

    // Get bookings by email (optional)
    app.get('/bookings', async (req, res) => {
      try {
        const query = req.query?.email ? { email: req.query.email } : {};
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve bookings' });
      }
    });

    // Confirm successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('Doctor is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});