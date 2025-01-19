const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_TEST_KEY);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Create a new booking and initiate checkout
router.post('/create-checkout-session', async (req, res) => {
    try {
      const { email, bookingDetails } = req.body;
      
      // Enhanced validation
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
  
      if (!bookingDetails) {
        return res.status(400).json({ message: 'Booking details are required' });
      }
  
      const requiredFields = [
        'restaurantId',
        'restaurantName',
        'selectedDate',
        'selectedSlot',
        'selectedTimeSlotPrice'
      ];
  
      for (const field of requiredFields) {
        if (!bookingDetails[field]) {
          return res.status(400).json({ message: `Missing required field: ${field}` });
        }
      }
  
      // Validate price is a number and greater than 0
      if (typeof bookingDetails.selectedTimeSlotPrice !== 'number' || bookingDetails.selectedTimeSlotPrice <= 0) {
        return res.status(400).json({ message: 'Invalid price' });
      }
  
      console.log('Creating Stripe session with data:', {
        email,
        amount: bookingDetails.selectedTimeSlotPrice,
        restaurant: bookingDetails.restaurantName
      });
  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Reservation at ${bookingDetails.restaurantName}`,
                description: `${new Date(bookingDetails.selectedDate).toLocaleDateString()} at ${bookingDetails.selectedSlot}`
              },
              unit_amount: Math.round(bookingDetails.selectedTimeSlotPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.VITE_APP_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.VITE_APP_URL}/booking/cancelled`,
        customer_email: email,
        metadata: {
          restaurantId: bookingDetails.restaurantId,
          restaurantName: bookingDetails.restaurantName,
          bookingDate: bookingDetails.selectedDate,
          bookingTime: bookingDetails.selectedSlot,
          timestamp: new Date().toISOString()
        },
      });
  
      console.log('Stripe session created:', session.id);
  
      // Store in Supabase
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            restaurant_id: bookingDetails.restaurantId,
            restaurant_name: bookingDetails.restaurantName,
            booking_date: bookingDetails.selectedDate,
            booking_time: bookingDetails.selectedSlot,
            email: email,
            price: bookingDetails.selectedTimeSlotPrice,
            status: 'pending',
            stripe_session_id: session.id
          }
        ])
        .select();
  
      if (bookingError) {
        console.error('Supabase Error:', bookingError);
        return res.status(500).json({ message: 'Failed to store booking', error: bookingError });
      }
  
      return res.json({ 
        sessionId: session.id,
        bookingId: booking[0].id
      });
  
    } catch (err) {
      console.error('Server error:', err);
      return res.status(500).json({ 
        message: 'Error creating checkout session',
        error: err.message
      });
    }
  });
  
// Webhook to handle Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Update booking status to confirmed
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('stripe_session_id', session.id);
  
        if (updateError) {
          console.error('Error updating booking status:', updateError);
        }
  
        // Send confirmation email (implement your email service here)
        // await sendConfirmationEmail(session.customer_email, session.metadata);
        break;
  
      case 'checkout.session.expired':
        // Handle expired checkout sessions
        const expiredSession = event.data.object;
        
        // Update booking status to expired
        const { error: expireError } = await supabase
          .from('bookings')
          .update({ status: 'expired' })
          .eq('stripe_session_id', expiredSession.id);
  
        if (expireError) {
          console.error('Error updating expired booking:', expireError);
        }
        break;
    }
  
    res.json({ received: true });
});

module.exports = router;