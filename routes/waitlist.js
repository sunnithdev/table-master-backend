const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Add to waitlist
router.post('/', async (req, res) => {
    try {
        const { email, restaurantId } = req.body;

        if (!email || !restaurantId) {
            return res.status(400).json({ message: 'Email and restaurantId are required' });
        }

        const { data, error } = await supabase
            .from('waitlist')
            .insert([{ email, restaurant_id: restaurantId }]);

        if (error) throw error;

        res.status(201).json({ message: 'Successfully added to the waitlist', data });
    } catch (err) {
        console.error('Error adding to waitlist:', err);
        res.status(500).json({ message: 'Error adding to waitlist' });
    }
});

// Get waitlist for a restaurant
router.get('/:restaurantId', async (req, res) => {
    try {
        const { data: waitlist, error } = await supabase
            .from('waitlist')
            .select('*')
            .eq('restaurant_id', req.params.restaurantId);

        if (error) throw error;

        res.json(waitlist);
    } catch (err) {
        console.error('Error fetching waitlist:', err);
        res.status(500).json({ message: 'Error fetching waitlist' });
    }
});

// Remove from waitlist
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('waitlist')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Successfully removed from the waitlist', data });
    } catch (err) {
        console.error('Error removing from waitlist:', err);
        res.status(500).json({ message: 'Error removing from waitlist' });
    }
});

module.exports = router;
