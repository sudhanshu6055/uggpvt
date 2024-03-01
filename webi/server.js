const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
// const mongoURI = 'mongodb+srv://universalgrowthgroup:LbiuVIs4Q0DQvyqT@cluster0.qcviqmn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const mongoURI = 'mongodb://localhost:27017/DADU';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Create User schema and model
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    password: String,
    fullName: String,
    email: String,
    dateOfBirth: Date,
    address: String,
    gender: String,
    aadharNumber: Number,
    panNumber: String,
    bankName: String,
    accountNumber: Number,
    ifscCode: String,
    isAdmin: { type: Boolean, default: false },
    approved: { type: Boolean, default: false }
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secret', resave: true, saveUninitialized: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware function to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware function to check if user is an admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.status(403).render('error', { message: 'Access Forbidden', error: {} });
    }
};

// Routes

app.get('/about', (req, res) => {
    res.render('about');
});
app.get('/about', function(req, res) {
    res.send('about');
  });
  
app.get('/contact', (req, res) => {
    res.render('contact');
});
app.get('/', isAuthenticated, (req, res) => {
    res.render('index', { username: req.session.user.username });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user && user.approved) {
            req.session.user = { username: user.username, isAdmin: user.isAdmin };
            res.redirect(user.isAdmin ? '/admin' : '/');
        } else {
            res.render('error', { message: 'Invalid credentials', error: {} });
        }
    } catch (err) {
        console.error('Error logging in:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const newUser = await User.create(req.body);
        res.redirect('/login');
    } catch (err) {
        console.error('Error registering user:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.get('/admin/login', (req, res) => {
    res.render('admin-login');
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'adminpassword') {
        req.session.user = { username: 'admin', isAdmin: true };
        res.redirect('/admin');
    } else {
        res.render('error', { message: 'Invalid admin credentials', error: {} });
    }
});

app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin');
});

app.get('/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.render('user-management', { users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.post('/admin/users/:userId/approve', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        await User.findByIdAndUpdate(userId, { approved: true });
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error approving user:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.post('/admin/users/:userId/deny', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        await User.findByIdAndDelete(userId);
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error denying user:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error logging out:', err);
        }
        res.redirect('/login');
    });
});

app.get('/admin/user-details', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.render('User_details', { users });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.get('/user-details', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        res.render('User_details', { user });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

app.get('/admin/users/:userId/details', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        res.render('User_details', { user });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.render('error', { message: 'Error occurred', error: err });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
