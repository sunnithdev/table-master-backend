const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.post('/available_dates', async (req, res) => {
    const { restaurant_id, date, time_slots } = req.body;

    // Ensure the necessary data is provided
    if (!restaurant_id || !date || !time_slots || !Array.isArray(time_slots)) {
        return res.status(400).json({ error: 'Missing required fields or invalid payload' });
    }

    try {
        // Insert the date into the available_dates table
        const { data: availableDateData, error: availableDateError } = await supabase
            .from('available_dates')
            .insert([{ restaurant_id, date }])
            .select();

        if (availableDateError) {
            return res.status(500).json({ error: 'Error inserting available date: ' + availableDateError.message });
        }

        const available_date_id = availableDateData[0].id; // Get the inserted available_date ID

        // Prepare the time slots to be inserted with the available_date_id
        const timeSlotsToInsert = time_slots.map((slot) => ({
            available_date_id,
            time: slot.time,
            price: slot.price,
        }));

        // Insert the time slots into the time_slots table
        const { data: timeSlotsData, error: timeSlotsError } = await supabase
            .from('time_slots')
            .insert(timeSlotsToInsert);

        if (timeSlotsError) {
            return res.status(500).json({ error: 'Error inserting time slots: ' + timeSlotsError.message });
        }

        res.status(201).json({
            message: 'Available date and time slots added successfully!',
            available_date: availableDateData[0],
            time_slots: timeSlotsData,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.get('/:restaurantId/available_dates', async (req, res) => {
    const { restaurantId } = req.params;

    if (!restaurantId) {
        return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    try {
        // Fetch available_dates for the given restaurantId
        const { data: availableDates, error: datesError } = await supabase
            .from('available_dates')
            .select('id, date')
            .eq('restaurant_id', restaurantId);

        if (datesError) {
            return res.status(500).json({ error: 'Error fetching available dates: ' + datesError.message });
        }

        if (!availableDates || availableDates.length === 0) {
            return res.status(404).json({ message: 'No available dates found for this restaurant' });
        }

        // Fetch time_slots for all the available dates
        const availableDateIds = availableDates.map((date) => date.id);

        const { data: timeSlots, error: timeSlotsError } = await supabase
            .from('time_slots')
            .select('id, available_date_id, time, price')
            .in('available_date_id', availableDateIds);

        if (timeSlotsError) {
            return res.status(500).json({ error: 'Error fetching time slots: ' + timeSlotsError.message });
        }

        // Combine dates with their respective time slots
        const result = availableDates.map((date) => ({
            id: date.id,
            date: date.date,
            time_slots: timeSlots.filter((slot) => slot.available_date_id === date.id),
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching available dates and time slots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



module.exports = router;
