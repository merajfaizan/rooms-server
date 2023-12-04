const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(express.json());
app.use(cors());

// db connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k5v5ibx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const userCollection = client.db("roomsDB").collection("users");
    const roomCollection = client.db("roomsDB").collection("rooms");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Endpoint to check email and add user
    app.post("/addUser", async (req, res) => {
      const { uid, name, email } = req.body;

      try {
        const existingUser = await userCollection.findOne({ email });

        if (existingUser) {
          return res
            .status(200)
            .json({ message: "Email already exists in the database" });
        }

        // Add the user to the collection
        await userCollection.insertOne({ uid, name, email });
        res.status(200).json({ message: "Your Successfully Registered" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // get all rooms with filters
    app.get("/rooms", async (req, res) => {
      try {
        // Fetching query parameters for filtering
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || 1000;

        // Construct the filter based on the provided price range
        const priceFilter = {
          $gte: minPrice,
          $lte: maxPrice,
        };

        // Apply the filter
        const query = { pricePerNight: priceFilter };
        const rooms = await roomCollection.find(query).toArray();

        res.json(rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Endpoint to get room details by ID
    app.get("/rooms/:roomId", verifyToken, async (req, res) => {
      try {
        const roomId = req.params.roomId;

        const room = await roomCollection.findOne({
          _id: new ObjectId(roomId),
        });

        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        res.json(room);
      } catch (error) {
        console.error("Error fetching room details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Endpoint to check room availability
    app.post("/checkAvailability", verifyToken, async (req, res) => {
      try {
        const { roomId, bookingDate } = req.body;

        const room = await roomCollection.findOne({
          _id: new ObjectId(roomId),
          bookedDates: bookingDate,
        });

        const isAvailable = !room;

        res.json({ available: isAvailable });
      } catch (error) {
        console.error("Error checking room availability:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// defaults
app.get("/", (req, res) => {
  res.send("Rooms Server is Online");
});

app.listen(port, () => {
  console.log(`Rooms Server listening on port ${port}`);
});
