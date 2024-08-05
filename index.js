const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'], // Change for production
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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

    // JWT Authentication
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_ACCESS_TOKEN, { expiresIn: '1h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false // Set to true for production
      }).send({ success: true });
    });

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
        const service = await serviceCollection.findOne(
          { _id: new ObjectId(id) },
          { projection: { service_id: 1, title: 1, img: 1, price: 1 } }
        );
        service ? res.send(service) : res.status(404).send({ message: "Service not found" });
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

    // Get bookings, optionally by email
    app.get('/bookings', async (req, res) => {
      try {
        const query = req.query?.email ? { email: req.query.email } : {};
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve bookings' });
      }
    });

    // Update a booking by ID
    app.patch('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedBooking = req.body;
        const result = await bookingCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: updatedBooking.status } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to update booking' });
      }
    });

    // Delete a booking by ID
    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete booking' });
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