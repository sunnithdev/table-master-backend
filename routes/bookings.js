const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get booking details
router.get('/:stripe_session_id', async (req, res) => {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('stripe_session_id', req.params.stripe_session_id)
        .single();
  
      if (error) throw error;
  
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
  
      res.json(booking);
    } catch (err) {
      console.error('Error fetching booking:', err);
      res.status(500).json({ message: 'Error fetching booking details' });
    }
  });
  
  // Get user's bookings
  router.get('/user', async (req, res) => {
    try {
      const { email } = req.query;
  
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
  
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('email', email)
        .order('booking_date', { ascending: true });
  
      if (error) throw error;
  
      res.json(bookings);
    } catch (err) {
      console.error('Error fetching user bookings:', err);
      res.status(500).json({ message: 'Error fetching bookings' });
    }
  });
  
  // Cancel booking
  router.post('/api/bookings/:bookingId/cancel', async (req, res) => {
    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', req.params.bookingId)
        .single();
  
      if (fetchError) throw fetchError;
  
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
  
      if (booking.status === 'confirmed') {
        // Process refund if needed
        // await stripe.refunds.create({
        //   payment_intent: booking.payment_intent_id,
        // });
      }
  
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', req.params.bookingId);
  
      if (updateError) throw updateError;
  
      res.json({ message: 'Booking cancelled successfully' });
    } catch (err) {
      console.error('Error cancelling booking:', err);
      res.status(500).json({ message: 'Error cancelling booking' });
    }
  });

module.exports = router;