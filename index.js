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

// Create a MongoClient with MongoClientOptions to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Database and collection
    const serviceCollection = client.db('carDoctor').collection('services');

    // Route to get all services
    app.get('/services', async (req, res) => {
      try {
        const result = await serviceCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve services' });
      }
    });

    // Route to get a specific service by ID
    app.get('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = {
          projection: { title: 1, price: 1, service_id: 1, img: 1 },
        };

        const service = await serviceCollection.findOne(query, options);
        if (service) {
          res.send(service);
        } else {
          res.status(404).send({ message: "Service not found" });
        }
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve service' });
      }
    });

    // Ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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