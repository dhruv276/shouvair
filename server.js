require('dotenv').config(); 

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in .env");
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}


// ADDED FOR INTEGRATION TESTING
if (process.env.NODE_ENV !== "test") {   
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error("MongoDB Error", err));
}


// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },   
  password: { type: String, required: true } 
});

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  emailAddress: { type: String, required: true },
  yourMessage: { type: String, required: true },
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fullName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  location: { type: String, required: true },
  totalPrice: { type: Number, required: true }
});



// User indexing
userSchema.index({ username: 1 }, { unique: true }); 

// Contact indexing
contactSchema.index({ emailAddress: 1 }); 
contactSchema.index({ name: "text", yourMessage: "text" });

// Order indexing
orderSchema.index({ userId: 1 });
orderSchema.index({ userId: 1, fullName: 1 });
orderSchema.index({ totalPrice: 1 });


// Models
const User = mongoose.model("User", userSchema);
const Contact = mongoose.model("Contact", contactSchema);
const Order = mongoose.model("Order", orderSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());

// Kind of a helper
function getUsernameFromRequest(req) {
  try {
    const token = req.cookies?.token;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.username || null;
  } catch (err) {
    return null;
  }
}

// Custom middleware for Auth
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Routes
app.get('/', (req, res) => res.render('welcome'));
app.get('/welcome', (req, res) => res.render('welcome'));
app.get('/dashboard', (req, res) => {
  const username = getUsernameFromRequest(req) || 'User';
  res.render('dashboard', { username });
});
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => {
  const message = req.query.message;
  const error = req.query.error;
  res.render('contact', { message, error });
});
app.get('/reserve', requireAuth, (req, res) => {
  const message = req.query.message;
  const error = req.query.error;
  res.render('reserve', { message, error });
});

app.post('/reserve', requireAuth, async (req, res) => {
  const { location, fullName, contactNumber, totalPrice } = req.body;

  if (!location || !fullName || !contactNumber || !totalPrice) {
    return res.redirect('/reserve?error=' + encodeURIComponent('Please fill all fields'));
  }

  const priceNum = Number(totalPrice);
  if (Number.isNaN(priceNum) || priceNum < 0) {
    return res.redirect('/reserve?error=' + encodeURIComponent('Invalid total price'));
  }

  try {
    await Order.create({
      userId: req.user.id,
      fullName,
      contactNumber,
      location,
      totalPrice: priceNum
    });

    return res.redirect('/reserve?message=' + encodeURIComponent('Order placed successfully!'));
  } catch (error) {
    console.error('Order create error:', error);
    return res.redirect('/reserve?error=' + encodeURIComponent('Failed to place order'));
  }
});

app.get('/user', requireAuth, async (req, res) => {
  const username = req.user.username;
  const message = req.query.message || null;

  try {
    const orders = await Order.find({ userId: req.user.id });
    
    const orderList = orders.map(o => ({
      fullName: o.fullName,
      location: o.location,
      totalPrice: o.totalPrice
    }));

    const userData = {
      orders: orderList,
      membershipStatus: "Gold Member",
      username
    };

    res.render('user', { userData, message });
  } catch (error) {
    console.error(error);
    res.render('user', {
      userData: {
        orders: [],
        membershipStatus: "Error fetching data",
        username
      },
      message
    });
  } 
});


app.get('/cap', (req, res) => res.render('cap'));
app.get('/bag', (req, res) => res.render('bag'));
app.get('/ties', (req, res) => res.render('ties'));
app.get('/dress', (req, res) => res.render('dress'));
app.get('/shirts', (req, res) => res.render('shirts'));
app.get('/polos', (req, res) => res.render('polos'));


// Login / Register
app.get('/login', (req, res) => res.render('login'));
app.get('/order', (req, res) => res.render('reserve', { message: null, error: null }));

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Please fill all fields' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).json({ message: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const created = await User.create({ username, password: hashed });

    const token = jwt.sign({ id: created._id, username: created.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*24*60*60*1000 });

    res.status(201).json({ message: 'Account created successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Please fill all fields' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid Username or Password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid Username or Password' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*24*60*60*1000 });

    res.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.redirect('/welcome');
});

// Contact form
app.post('/contact', async (req, res) => {
  const { name, emailAddress, yourMessage } = req.body;
  if (!name || !emailAddress || !yourMessage) return res.redirect('/contact?error=' + encodeURIComponent('Please fill all fields'));

  try {
    await Contact.create({ name, emailAddress, yourMessage });
    res.redirect('/contact?message=' + encodeURIComponent('Feedback submitted successfully!'));
  } catch (error) {
    console.error('Contact error:', error);
    res.redirect('/contact?error=' + encodeURIComponent('Failed to submit feedback.'));
  }
});

// Error Handling
app.use((req, res) => res.status(404).json({ status: 'error', message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack,
  });
});



if (process.env.NODE_ENV !== "test") {   
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// EXPORTING FOR UNIT TESTING (REQUIRED FOR JEST)
module.exports = {
  getUsernameFromRequest,
  requireAuth,
  User,
  Contact,
  Order,
  app    // ADDED FOR INTEGRATION TESTING
};
