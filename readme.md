# Rooms Server

This is the server-side code for the "Rooms" room booking website. The server is built using Express.js and interacts with MongoDB and Firebase for authentication.

## Technologies Used

- **Express.js:** Backend framework for building server-side applications.
- **MongoDB:** NoSQL database for storing room and user data.
- **Firebase:** Used for authentication services.
- **JWT (JSON Web Tokens):** Used for secure authentication and authorization.

## Getting Started

To set up the server locally, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/rooms-server.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   Create a .env file in the root directory and add the following variables:

   ```bash
   PORT=5000
   DB_USER=your-mongodb-username
   DB_PASS=your-mongodb-password
   ACCESS_TOKEN_SECRET=your-secret-for-jwt
   ```

4. Start the server:
   ```bash
   npm start
   ```
   The server will be running at http://localhost:5000 by default.

## API Endpoints

### POST /jwt

Generate a JWT token for authentication.

### POST /addUser

Add a user to the database.

### GET /rooms

Get all rooms with optional filters.

### GET /featured

Get featured rooms (limit: 3).

### GET /rooms/:roomId

Get details of a specific room by ID.

### POST /checkAvailability

Check room availability for a given date.

### POST /bookRoom

Book a room (requires JWT authentication).

### GET /my-bookings

Get a list of user's booked rooms (requires JWT authentication).

### DELETE /cancel-booking/:bookingId

Cancel a booked room (requires JWT authentication).

## Contributing

1. We welcome contributions! If you'd like to contribute to Rooms.

## Contact

1. For inquiries and support, contact us at [merajfzn@gmail.com](mailto:merajfzn@gmail.com).
