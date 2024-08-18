const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
app.use(cors({
  origin: ['http://localhost:5173'], // Update this in production
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB connection URI and client setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eyvufda.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Custom middleware for logging requests
const logger = (req, res, next) => {
  console.log('Request received:', req.method, req.originalUrl);
  next();
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("JWT token in middleware:", token);

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      console.log("JWT verification error:", err);
      return res.status(401).send({ message: 'Invalid token' });
    }
    console.log('Decoded token data:', decoded);
    req.user = decoded;
    next();
  });
};

// Main function to connect to MongoDB and handle routes
async function run() {
  try {
    // Connect to MongoDB
    await client.connect();

    // Database collections
    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');

    // Route to generate JWT token
    app.post('/jwt', logger, (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_ACCESS_TOKEN, { expiresIn: '1h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false // Set to true in production
      }).send({ success: true });
    });

    // Route to get all services
    app.get('/services', logger, async (req, res) => {
      try {
        const services = await serviceCollection.find().toArray();
        res.send(services);
      } catch (error) {
        console.error("Error retrieving services:", error);
        res.status(500).send({ message: 'Failed to retrieve services' });
      }
    });

    // Route to get a specific service by ID
    app.get('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const service = await serviceCollection.findOne(
          { _id: new ObjectId(id) },
          { projection: { service_id: 1, title: 1, img: 1, price: 1 } }
        );
        service ? res.send(service) : res.status(404).send({ message: "Service not found" });
      } catch (error) {
        console.error("Error retrieving service by ID:", error);
        res.status(500).send({ message: 'Failed to retrieve service' });
      }
    });

    // Route to create a new booking
    app.post('/bookings', async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).send({ message: 'Failed to create booking' });
      }
    });

    // Route to get bookings, optionally by email, with token verification
    app.get('/bookings', logger, verifyToken, async (req, res) => {
      try {
        console.log('Query email:', req.query.email);
        console.log('User data from token:', req.user);
        const query = req.query?.email ? { email: req.query.email } : {};
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        console.error("Error retrieving bookings:", error);
        res.status(500).send({ message: 'Failed to retrieve bookings' });
      }
    });

    // Route to update a booking by ID
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
        console.error("Error updating booking:", error);
        res.status(500).send({ message: 'Failed to update booking' });
      }
    });

    // Route to delete a booking by ID
    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).send({ message: 'Failed to delete booking' });
      }
    });

    // Confirm successful MongoDB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

// Execute the main function
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('Doctor is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});