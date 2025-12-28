const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import uuid for userId generation



const app = express();
app.use(bodyParser.json());
app.use(cors());

const dbURI = 'mongodb+srv://noobtuber775:Mugiwara_luffy@cluster0.rs05i.mongodb.net/hellow';

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // New userId field
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Import the membership model


// API to fetch user details by userId and check membership status
app.get('/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user by userId
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user has an active membership
    const membership = await Membership.findOne({ userId });

    // If the user has an active membership
    const membershipStatus = membership ? 'Active' : 'Inactive';

    // Return user data including membership status
    const userData = {
      name: user.name,
      email: user.email,
      userId: user.userId,
      membershipStatus, // Active if membership exists, otherwise Inactive
    };

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user details:', error);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

app.put('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { name, email } = req.body;

  try {
      // Use findOneAndUpdate to search by UUID
      const updatedUser = await User.findOneAndUpdate(
          { userId: userId }, // Assuming userId is the field in your schema that stores the UUID
          { name, email },
          { new: true, runValidators: true } // Return the updated document
      );

      if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
          message: 'Profile updated successfully',
          user: {
              name: updatedUser.name,
              email: updatedUser.email,
              membershipStatus: updatedUser.membershipStatus, // Include membership status if needed
          },
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating profile', error });
  }
});


// Membership Schema
const membershipSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  plan: { type: String, required: true },
  price: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
});

const Membership = mongoose.model('Membership', membershipSchema);

app.get('/checkMembership/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const membership = await Membership.findOne({ userId });
    if (membership && new Date() <= membership.endDate) {
      res.status(200).json({ hasMembership: true });
    } else {
      res.status(200).json({ hasMembership: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


// Food Schema
const foodSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  food: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Food = mongoose.model('Food', foodSchema);

// Registration Route
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4(); // Generate unique userId

    const newUser = new User({
      userId,  // Add userId to the user object
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.userId }, 'secret_key', { expiresIn: '1h' }); // Sign token with userId

    res.json({ token, user: { id: user.userId, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Endpoint to get membership details for a user
app.get('/membership/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find the membership details for the user
    const membership = await Membership.findOne({ userId: userId });

    if (!membership) {
      return res.status(404).json({ message: "No membership found for this user." });
    }

    // Calculate days remaining
    const currentDate = new Date();
    const expiryDate = new Date(membership.endDate);
    const timeDiff = expiryDate - currentDate;
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Respond with membership details
    res.status(200).json({
      plan: membership.plan,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0, // Ensure non-negative days
    });
  } catch (error) {
    console.error("Error fetching membership details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Purchase Membership Route
app.post('/purchase', async (req, res) => {
  const { userId, plan, price } = req.body;

  try {
    // Check if the user already has an active membership
    const existingMembership = await Membership.findOne({ userId: userId });

    if (existingMembership) {
      // Calculate remaining days
      const currentDate = new Date();
      const expiryDate = new Date(existingMembership.endDate);
      const timeDiff = expiryDate - currentDate;
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

      // If the membership is still valid or more than 3 days remaining, don't allow purchase
      if (daysRemaining > 3) {
        return res.status(400).json({ message: 'You already have an active membership. It will expire in ' + daysRemaining + ' days.' });
      }
    }

    // Calculate end date based on the selected plan
    let endDate = new Date();
    if (plan === "Monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan === "6 Months") {
      endDate.setMonth(endDate.getMonth() + 6);
    } else if (plan === "Yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const newMembership = new Membership({
      userId,
      plan,
      price,
      endDate,
    });

    await newMembership.save();

    res.status(201).json({ message: 'Membership purchased successfully' });
  } catch (error) {
    console.error("Error purchasing membership:", error);
    res.status(500).json({ message: 'Error purchasing membership' });
  }
});

// Add Food Entry Route
app.post('/add-food', async (req, res) => {
  const { userId, food, calories, protein, quantity } = req.body;

  try {
    const foodEntry = new Food({
      userId,
      food,
      calories,
      protein,
      quantity,
      date: new Date(), // Current date
    });

    await foodEntry.save();
    res.status(201).json({ message: 'Food entry added successfully' });
  } catch (error) {
    console.error("Error adding food entry:", error);
    res.status(500).json({ message: 'Error adding food entry' });
  }
});

// Get Food Entries by Date Endpoint
app.post('/get-food-entries', async (req, res) => {
  const { userId, date } = req.body;

  try {
    const foodEntries = await Food.find({
      userId,
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)), // to include the whole day
      },
    });

    res.status(200).json({ entries: foodEntries });
  } catch (error) {
    console.error("Error fetching food entries:", error);
    res.status(500).json({ message: 'Error fetching food entries' });
  }
});

// Edit Food Entry Route
app.put('/edit-food/:id', async (req, res) => {
  const { id } = req.params;
  const { food, calories, protein, quantity } = req.body;

  try {
    const updatedEntry = await Food.findByIdAndUpdate(
      id,
      { food, calories, protein, quantity },
      { new: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Food entry not found' });
    }

    res.status(200).json({ message: 'Food entry updated successfully', entry: updatedEntry });
  } catch (error) {
    console.error("Error updating food entry:", error);
    res.status(500).json({ message: 'Error updating food entry' });
  }
});

// Delete Food Entry Route
app.delete('/delete-food/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedEntry = await Food.findByIdAndDelete(id);

    if (!deletedEntry) {
      return res.status(404).json({ message: 'Food entry not found' });
    }

    res.status(200).json({ message: 'Food entry deleted successfully' });
  } catch (error) {
    console.error("Error deleting food entry:", error);
    res.status(500).json({ message: 'Error deleting food entry' });
  }
});

const calorieLimitSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  dailyCalorieLimit: { type: Number, required: true },
});

const CalorieLimit = mongoose.model('CalorieLimit', calorieLimitSchema);

// Add this new endpoint to set the calorie limit
app.post('/calorie-limit', async (req, res) => {
  const { userId, calorieLimit } = req.body;

  // Check if both userId and calorieLimit are provided
  if (!userId || calorieLimit === undefined) {
    return res.status(400).json({ message: 'User ID and calorie limit are required.' });
  }

  try {
    // Check if the user already has a calorie limit set
    let existingLimit = await CalorieLimit.findOne({ userId });

    if (existingLimit) {
      // If a limit exists, update it
      existingLimit.dailyCalorieLimit = calorieLimit;
      await existingLimit.save(); // Save the updated document
    } else {
      // If no limit exists, create a new one
      const newCalorieLimit = new CalorieLimit({ userId, dailyCalorieLimit: calorieLimit });
      await newCalorieLimit.save(); // Save the new document
    }

    // Respond with success message and updated calorie limit
    res.status(200).json({
      message: 'Calorie limit set successfully!',
      dailyCalorieLimit: calorieLimit, // Send the updated limit back
    });
  } catch (error) {
    console.error("Error setting calorie limit:", error);
    res.status(500).json({ message: 'Error setting calorie limit' });
  }
});


// Existing get calorie limit endpoint
app.get('/calorie-limit/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const calorieLimit = await CalorieLimit.findOne({ userId });

    if (!calorieLimit) {
      return res.status(404).json({ message: 'Calorie limit not found' });
    }

    res.status(200).json({ dailyCalorieLimit: calorieLimit.dailyCalorieLimit });
  } catch (error) {
    console.error("Error fetching calorie limit:", error);
    res.status(500).json({ message: 'Error fetching calorie limit' });
  }
});

app.post('/daily-calorie-intake', async (req, res) => {
  const { userId, date } = req.body;

  try {
    // Fetch calorie limit for the user
    const calorieLimitDoc = await CalorieLimit.findOne({ userId });
    if (!calorieLimitDoc) {
      return res.status(404).json({ message: 'Calorie limit not set for user' });
    }

    const dailyCalorieLimit = calorieLimitDoc.dailyCalorieLimit;

    // Fetch food entries for the specified date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0); // Set to the beginning of the day
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999); // Set to the end of the day

    const foodEntries = await Food.find({
      userId,
      date: { $gte: startDate, $lt: endDate },
    });

    // Calculate total calories consumed
    const totalCaloriesConsumed = foodEntries.reduce((acc, entry) => acc + entry.calories, 0);

    // Calculate remaining calories
    const remainingCalories = dailyCalorieLimit - totalCaloriesConsumed;

    res.status(200).json({
      dailyCalorieLimit,
      totalCaloriesConsumed,
      remainingCalories: remainingCalories > 0 ? remainingCalories : 0, // Ensure non-negative
    });
  } catch (error) {
    console.error('Error fetching daily calorie intake:', error);
    res.status(500).json({ message: 'Error fetching daily calorie intake' });
  }
});


const workoutSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  exercise: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  weight: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const Workout = mongoose.model('Workout', workoutSchema);

// Add Workout Entry Route
app.post('/add-workout', async (req, res) => {
  const { userId, exercise, sets, reps,weight } = req.body;

  try {
    const workoutEntry = new Workout({
      userId,
      exercise,
      sets,
      reps,
      weight,
    });

    await workoutEntry.save();
    res.status(201).json({ message: 'Workout entry added successfully' });
  } catch (error) {
    console.error("Error adding workout entry:", error);
    res.status(500).json({ message: 'Error adding workout entry' });
  }
});

// Get Workouts by User ID Endpoint
app.get('/workouts/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const workouts = await Workout.find({ userId });

    res.status(200).json({ workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    res.status(500).json({ message: 'Error fetching workouts' });
  }
});

app.get('/get-workouts/:userId/:date', async (req, res) => {
  const { userId, date } = req.params;

  try {
    const workouts = await Workout.find({
      userId,
      date: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000) } // Fetch workouts for the specific date
    });

    res.status(200).json(workouts);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    res.status(500).json({ message: 'Error fetching workouts' });
  }
});

// Delete Workout Route
app.delete('/delete-workout/:userId/:workoutId', async (req, res) => {
  const { userId, workoutId } = req.params;

  try {
    const deletedWorkout = await Workout.findOneAndDelete({ userId, _id: workoutId });

    if (!deletedWorkout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    res.status(200).json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error("Error deleting workout:", error);
    res.status(500).json({ message: 'Error deleting workout' });
  }
});

const exerciseSchema = new mongoose.Schema({
  bodyPart: { type: String, required: true },
  exerciseName: { type: String, required: true },
  steps: { type: [String], required: true },
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/exercises/chest', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'chest' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No chest exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching chest exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});

app.get('/exercises/back', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'back' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No back exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching back exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});

app.get('/exercises/shoulders', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'shoulders' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No shoulders exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching shoulders exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});

app.get('/exercises/triceps', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'triceps' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No triceps exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching triceps exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});

app.get('/exercises/biceps', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'biceps' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No biceps exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching biceps exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});

app.get('/exercises/legs', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'legs' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No legs exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching legs exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});

app.get('/exercises/abs', async (req, res) => {
  try {
    const exercises = await Exercise.find({ bodyPart: 'abs' });

    if (exercises.length === 0) {
      return res.status(404).json({ message: 'No abs exercises found.' });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching abs exercises:', error); // Log the error for debugging
    res.status(500).json({ message: 'An error occurred while fetching exercises.' });
  }
});



// Notice Schema with TTL
const noticeSchema = new mongoose.Schema({
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now, expires: '3d' }, // TTL index
});

const Notice = mongoose.model('Notice', noticeSchema);


app.post('/addnotices', async (req, res) => {
  const { title, description } = req.body;

  try {
    const newNotice = new Notice({ title, description });
    await newNotice.save();
    res.status(201).json({ message: 'Notice added successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding notice', error });
  }
});


// API to fetch important notices
app.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find();
    res.json(notices);
  } catch (error) {
    res.status(500).send(error);
  }
});

// DELETE route to delete a notice by its ID
app.delete('/notices/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await Notice.findByIdAndDelete(id); // Find the notice by ID and delete it
    res.status(200).json({ message: 'Notice deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notice', error });
  }
});


const adminSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // New userId field
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Admin = mongoose.model('Admin', adminSchema);

app.post('/adminregister', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4(); // Generate unique userId

    const newAdmin = new Admin({
      userId,  // Add userId to the user object
      name,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();

    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login Route
app.post('/adminlogin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.userId }, 'secret_key', { expiresIn: '1h' }); // Sign token with userId

    res.json({ token, admin: { id: admin.userId, name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/members', async (req, res) => {
  try {
    const { plan, sortBy } = req.query; // Read optional 'plan' and 'sortBy' query params
    const memberships = await Membership.find();
    const users = await User.find();

    const currentDate = new Date(); // Get the current date

    // Filter memberships where the endDate is in the future (i.e., membership is still active)
    let activeMemberships = memberships.filter(membership => new Date(membership.endDate) > currentDate);

    // Filter by 'plan' if provided (e.g., '1 Month', '6 Months', '1 Year')
    if (plan) {
      activeMemberships = activeMemberships.filter(membership => membership.plan === plan);
    }

    // Map active membership data to user data
    let memberDetails = activeMemberships.map(membership => {
      const user = users.find(user => user.userId === membership.userId);
      return {
        userId: membership.userId,
        name: user ? user.name : 'Unknown',
        email: user ? user.email : 'Unknown',
        plan: membership.plan,
        price: membership.price,
        startDate: membership.startDate,
        endDate: membership.endDate,
      };
    });

    // Sort by 'newest' or 'oldest' based on the 'sortBy' query param
    if (sortBy === 'newest') {
      memberDetails.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // Newest first
    } else if (sortBy === 'oldest') {
      memberDetails.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)); // Oldest first
    }

    res.json(memberDetails);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching members', error });
  }
});

app.delete('/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // Get the userId from the URL

    // Find and delete the membership associated with the userId
    const result = await Membership.deleteOne({ userId });

    if (result.deletedCount > 0) {
      return res.status(200).json({ message: 'Membership removed successfully.' });
    } else {
      return res.status(404).json({ message: 'Membership not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error removing membership', error });
  }
});



// Complaint Schema


// Define the Complaint schema
const ComplaintSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true }, // Reference to the User model
  text: { type: String, required: true },
  reply: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', ComplaintSchema);

// Fetch complaints by userId
// POST: Submit a complaint
app.post('/complaints', async (req, res) => {
  const { userId, text } = req.body;

  // Check for missing data and log
  if (!userId || !text) {
    console.log("Missing data:", { userId, text });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const complaint = new Complaint({
      userId,
      text,
    });

    await complaint.save();
    console.log("Complaint saved:"); // Log the saved complaint
    return res.status(201).json({ message: 'Complaint submitted successfully!' });
  } catch (error) {
    console.error("Error submitting complaint:", error);
    return res.status(500).json({ error: 'Failed to submit complaint' });
  }
});



// GET: Fetch all complaints (Admin View)
app.get('/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });

    // Fetch user names for each complaint
    const complaintsWithUserNames = await Promise.all(
      complaints.map(async (complaint) => {
        const user = await User.findOne({ userId: complaint.userId });
        return {
          _id: complaint._id,
          text: complaint.text,
          reply: complaint.reply,
          createdAt: complaint.createdAt,
          userName: user ? user.name : 'Unknown' // Fetch user name or set to 'Unknown'
        };
      })
    );

    return res.status(200).json(complaintsWithUserNames);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load complaints' });
  }
});

// GET: Fetch a specific user's complaints (for User View)
app.get('/complaints/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const complaints = await Complaint.find({ userId }).sort({ createdAt: -1 });
    if (complaints.length === 0) {
      return res.status(404).json({ message: 'No complaints found for this user.' });
    }
    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load complaints' });
  }
});

// POST: Admin reply to a complaint
app.post('/complaints/reply', async (req, res) => {
  const { complaintId, replyText } = req.body;

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.reply = replyText;
    await complaint.save();

    return res.status(200).json({ message: 'Reply sent successfully!' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send reply' });
  }
});

app.delete('/complaints/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedComplaint = await Complaint.findByIdAndDelete(id);
    if (!deletedComplaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    return res.status(200).json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error("Error deleting complaint:", error);
    return res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
