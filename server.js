const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Import models
const User = require('./models/User');
const FitnessData = require('./models/FitnessData');

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb+srv://vrumao:55106528%40QAz@cluster0.bikhn8h.mongodb.net/healthfitness?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Static files path
const staticPath = path.join(__dirname);
app.use(express.static(staticPath));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Sign Up Route
app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        user = new User({ firstName, lastName, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid Credentials: User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Credentials: Incorrect password' });
        }
        const payload = {
            user: {
                id: user.id
            }
        };
        jwt.sign(payload, 'yourSecretKey', { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.json({ success: true, token });
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send('Server error');
    }
});

// Save fitness data route
app.post('/fitness_data', async (req, res) => {
    const { email, type, value } = req.body;
    try {
        const fitnessData = new FitnessData({
            email,
            type,
            value,
            date: new Date().toISOString().split('T')[0] // Save the current date
        });
        await fitnessData.save();
        console.log('Fitness data saved:', fitnessData);
        res.json({ success: true, message: 'Fitness data saved successfully' });
    } catch (err) {
        console.error('Fitness data save error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});


// Get user profile route
app.get('/user_profile', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('User profile error:', err.message);
        res.status(500).send('Server error');
    }
});

// Get past data route
app.get('/past_data', async (req, res) => {
    const { email } = req.query;
    try {
        const data = await FitnessData.find({ email }).sort({ date: -1 });
        res.json({ success: true, data });
    } catch (err) {
        console.error('Past data retrieval error:', err.message);
        res.status(500).send('Server error');
    }
});

// Get summarized data for charts
app.get('/fitness_data_summary', async (req, res) => {
    const { email } = req.query;
    try {
        const stepsTarget = 5000;
        const waterTarget = 3000; // ml
        const caloriesTarget = 2000;

        const stepsData = await FitnessData.findOne({ email, type: 'dailySteps' }).sort({ date: -1 });
        const waterData = await FitnessData.findOne({ email, type: 'waterIntake' }).sort({ date: -1 });
        const caloriesData = await FitnessData.findOne({ email, type: 'caloriesIntake' }).sort({ date: -1 });

        const stepsActual = stepsData ? stepsData.value : 0;
        const waterActual = waterData ? waterData.value : 0;
        const caloriesActual = caloriesData ? caloriesData.value : 0;

        res.json({
            success: true,
            steps: { target: stepsTarget, actual: stepsActual },
            water: { target: waterTarget, actual: waterActual },
            calories: { target: caloriesTarget, actual: caloriesActual }
        });
    } catch (err) {
        console.error('Fitness data summary error:', err.message);
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
