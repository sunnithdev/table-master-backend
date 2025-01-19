require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const bodyParser = require('body-parser');


const restaurantsRoutes = require('./routes/restaurants');
const reservationsRoutes = require('./routes/reservations');
const bookingsRoutes = require('./routes/bookings');
const stripeRoutes = require('./routes/stripe');
const waitlistRoutes = require('./routes/waitlist');
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/waitlist', waitlistRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
