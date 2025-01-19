const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get filtered restaurants
router.get('/', async (req, res) => {
    const { location, party_size, available_dates, time } = req.query;

    try {
        // Start with the base query to get all restaurants
        let query = supabase.from('restaurants').select('*');

        // Create a separate query for filtering available_dates and time_slots
        if (available_dates || time) {
            query = query.select(`
                *,
                available_dates!inner(
                    date,
                    time_slots!inner(
                        time
                    )
                )
            `);
        } else {
            query = query.select(`
                *,
                available_dates(
                    date,
                    time_slots(
                        time
                    )
                )
            `);
        }

        // Apply location filter if provided
        if (location) {
            query = query.eq('location', location);
        }

        // Apply available_dates filter if provided
        if (available_dates) {
            query = query.eq('available_dates.date', available_dates);
        }

        // Apply time filter if provided
        if (time) {
            query = query.eq('available_dates.time_slots.time', time);
        }

        // Fetch results
        const { data, error } = await query;

        if (error) throw error;

        // Respond with the data
        res.json(data);
    } catch (error) {
        console.error('Error fetching filtered restaurants:', error.message);
        res.status(500).send('Internal Server Error');
    }
});



// Get a specific restaurant by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('restaurants')
        .select('*, available_dates(*, time_slots(*))')
        .eq('id', id)
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});


// POST /restaurants - Create a new restaurant
router.post('/', async (req, res) => {
    try {
        const { user_id, name, description, address, location, rating, michelin, price_range, images, features } = req.body;

        // Ensure all required fields are present
        if (!user_id || !name || !location) {
            return res.status(400).json({ error: 'User ID, name, and location are required' });
        }

        const { data, error } = await supabase
            .from('restaurants')
            .insert({
                user_id,
                name,
                description,
                address,
                location,
                rating,
                michelin,
                price_range,
                images,
                features,
            })
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating restaurant:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /restaurants/:id/availability - Add availability for a restaurant
router.post('/:id/availability', async (req, res) => {
    const { id: restaurant_id } = req.params;
    const { user_id, available_dates } = req.body;

    if (!user_id || !available_dates || !Array.isArray(available_dates)) {
        return res.status(400).json({ error: 'User ID and valid available_dates are required' });
    }

    try {
        // Ensure the restaurant belongs to the specified user
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id, user_id')
            .eq('id', restaurant_id)
            .single();

        if (restaurantError || restaurant.user_id !== user_id) {
            return res.status(403).json({ error: 'Forbidden: Not your restaurant' });
        }

        // Insert available dates
        const dateEntries = available_dates.map((dateEntry) => ({
            restaurant_id,
            date: dateEntry.date,
        }));

        const { data: dates, error: dateError } = await supabase
            .from('available_dates')
            .insert(dateEntries)
            .select('id, date');

        if (dateError) throw dateError;

        // Insert time slots for each date
        const timeSlotEntries = [];
        dates.forEach((date, index) => {
            if (available_dates[index].time_slots) {
                available_dates[index].time_slots.forEach((timeSlot) => {
                    timeSlotEntries.push({
                        available_date_id: date.id,
                        time: timeSlot.time,
                        price: timeSlot.price,
                    });
                });
            }
        });

        const { data: timeSlots, error: timeSlotError } = await supabase
            .from('time_slots')
            .insert(timeSlotEntries);

        if (timeSlotError) throw timeSlotError;

        res.status(201).json({ message: 'Availability added successfully', dates, timeSlots });
    } catch (error) {
        console.error('Error adding availability:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get restaurant by user ID
router.get('/user/:userId', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', req.params.userId)
        .limit(1)
  
      if (error) {
        return res.status(500).json({ error: error.message })
      }
  
      res.json(data || {})
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

module.exports = router;
