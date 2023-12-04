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
    // get featured rooms only 3
    app.get("/featured", async (req, res) => {
      try {
        const rooms = await roomCollection.find({}).limit(3).toArray();

        res.json(rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Endpoint to get room details by ID
    app.get("/rooms/:roomId", async (req, res) => {
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
    app.post("/checkAvailability", async (req, res) => {
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

    // Endpoint to book a room
    app.post("/bookRoom", verifyToken, async (req, res) => {
      try {
        const { roomId, bookingDate } = req.body;
        const userEmail = req.decoded.email;

        // Find the user by email
        const user = await userCollection.findOne({ email: userEmail });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if the room is available on the selected date
        const room = await roomCollection.findOne({
          _id: new ObjectId(roomId),
        });
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        const selectedDateISO = new Date(bookingDate)
          .toISOString()
          .split("T")[0];
        if (room.bookedDates.includes(selectedDateISO)) {
          return res
            .status(400)
            .json({ message: "Room not available on the selected date" });
        }

        // Update the room data to mark it as booked on the selected date
        await roomCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $push: { bookedDates: selectedDateISO } }
        );

        // Update the user's bookings
        await userCollection.updateOne(
          { email: userEmail },
          {
            $push: {
              myBookings: {
                roomId,
                bookingDate: selectedDateISO,
                roomDetails: {
                  title: room.title,
                  pricePerNight: room.pricePerNight,
                  roomSize: room.roomSize,
                },
              },
            },
          }
        );

        res.status(200).json({ message: "Room booked successfully" });
      } catch (error) {
        console.error("Error booking room:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Endpoint to get user's booked data
    app.get("/my-bookings", verifyToken, async (req, res) => {
      try {
        const userEmail = req.decoded.email;

        // Fetch user's booked data from the database
        const user = await userCollection.findOne({ email: userEmail });

        if (!user || !user.myBookings) {
          return res.status(200).json([]);
        }

        res.status(200).json(user.myBookings);
      } catch (error) {
        console.error("Error fetching user's bookings:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Endpoint to cancel a booking
    app.delete("/cancel-booking/:bookingId", verifyToken, async (req, res) => {
      try {
        const email = req.decoded.email; // Assuming the decoded email is the user identifier
        const roomId = req.params.bookingId;

        // Find the user in the database
        const user = await userCollection.findOne({ email: email });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Find the booking in the user's bookings
        const bookingIndex = user.myBookings.findIndex(
          (booking) => booking.roomId === roomId
        );

        if (bookingIndex === -1) {
          return res.status(404).json({ message: "Booking not found" });
        }
        console.log(bookingIndex);

        // Check if the user can cancel the booking (before 1 day from the booking day)
        const bookingDate = new Date(user.myBookings[bookingIndex].bookingDate);
        const currentDate = new Date();
        const oneDayInMillis = 24 * 60 * 60 * 1000; // 1 day in milliseconds

        if (bookingDate - currentDate < oneDayInMillis) {
          console.log(
            bookingDate,
            currentDate,
            oneDayInMillis,
            bookingDate - currentDate < oneDayInMillis
          );
          return res.status(400).json({
            message:
              "Booking cannot be canceled. It's less than 1 day from the booking day.",
          });
        }

        // Remove the booking from the user's bookings
        const canceledBooking = user.myBookings.splice(bookingIndex, 1)[0];

        // Update the user document in the database
        await userCollection.updateOne(
          { email: email },
          { $set: { myBookings: user.myBookings } }
        );

        // Find the room in the database
        const room = await roomCollection.findOne({
          _id: new ObjectId(canceledBooking.roomId),
        });
        console.log(room.bookedDates);

        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        // Remove the booked dates from the room's bookedDates
        room.bookedDates = room.bookedDates.filter(
          (date) => date !== canceledBooking.bookingDate
        );

        console.log(room.bookedDates);
        // Update the room document in the database
        await roomCollection.updateOne(
          { _id: new ObjectId(canceledBooking.roomId) },
          { $set: { bookedDates: room.bookedDates } }
        );

        res
          .status(200)
          .json({ message: "Booking canceled successfully", canceledBooking });
      } catch (error) {
        console.error("Error canceling booking:", error);
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
