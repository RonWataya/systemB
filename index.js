const express = require("express");
const cors = require("cors");
const db = require("./config/db.js"); // Import your database connection from db.js
const sgMail = require('@sendgrid/mail');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();
const sendgridApiKey = '';

// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Add Access Control Allow Origin headers
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.use(cors({
    origin: '*'
}));

// Set the SendGrid API key
sgMail.setApiKey(sendgridApiKey);


// Initialize Passport and session management
app.use(session({
    secret: 'your-session-secret',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 1000, // 1 minute in milliseconds
    }
}));

app.use(passport.initialize());
app.use(passport.session());


// Define a route for fetching and sending "users" data as JSON
app.get("/api/users", (req, res) => {
    db.query("SELECT * FROM users", (error, results) => {
        if (error) {
           // console.error("Error fetching users data:", error);
            res.status(500).json({ message: "Error fetching users data" });
        } else {
           // console.log("Users data fetched successfully");
            res.status(200).json(results);
        }
    });
});


// Create a POST route for user registration
app.post("/api/register", (req, res) => {
    // Parse the JSON data from the request body
    const formData = req.body;
    function generateRandomNumber() {
    // Generate a random number with 12 digits
    const randomNumber = Math.floor(100000000000 + Math.random() * 900000000000);
    return randomNumber.toString(); // Convert to string to preserve leading zeros if any
}

const accountID = generateRandomNumber();
    //console.log('Received Form Data:', formData);
    // Perform user registration logic (insert data into the database)
    // Replace the following lines with your actual user registration code
    db.query("INSERT INTO users (firstName, lastName, phone, email, password, category, country, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [formData.firstname, formData.lastname, formData.phone, formData.email, formData.password, formData.category, formData.country, accountID],
        (error, results) => {
            if (error) {
                //console.error("Error registering user:", error);
                res.status(500).json({ message: "Error registering user" });
            } else {
                //console.log("User registered successfully");
                // Clear the session storage
                //  req.session.formData = null; // Replace 'formData' with your actual session variable name
                res.status(200).json({ message: "User registered successfully" });
            }
        });
});



//Verification 
app.post('/verification', (req, res) => {
    const formData = req.body;
    let targetMail = formData.email;



    // Print the received form data and verification code in the console
    //console.log('Received Form Data:', formData);


    // Construct the email message using the form data and generated code
    const msg = {
        to: targetMail,
        from: 'info@moneyhive-mw.com',
        subject: 'Account verification',
        text: 'Verification',
        html: `
        <strong>Paste the code below in the verification form on your browser</strong><br><br>
        Verification Code: ${formData.code}<br>
      `,
    };

    sgMail
        .send(msg)
        .then(() => {
           // console.log('Email sent');
            res.status(200).send('Email sent successfully');
        })
        .catch((error) => {
            //console.error(error);
            res.status(500).send('Error sending email');
        });
});

//Sign with google

// Set up Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
        clientID: '446811447600-dueug22p363u2h1mblorl29f2vqok2oe.apps.googleusercontent.com',
        clientSecret: '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',
        callbackURL: 'http://ec2-54-201-138-205.us-west-2.compute.amazonaws.com:3000/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
        // Retrieve email address from the profile
        const email = profile.emails[0].value;

        // Store user information, including email, in session or your database
        const user = {
            id: profile.id,
            displayName: profile.displayName,
            email: email
        };

        return done(null, user);
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    const userEmail = req.user.email;
    db.query('SELECT * FROM users WHERE email = ?', [userEmail], (error, results) => {
        if (error) {
           // console.error('Error fetching user data:', error);
            return res.status(500).json({ message: 'Error fetching user data' });
        } else {
            if (results.length > 0) {
                const user = results[0]; // Assuming the first result is the user data

                // Check the user's status and category
                const status = user.status;
                const category = user.category;

                // Construct redirect URL based on status and category
                let redirectUrl;
                if ((category === 'Micro Lender' || category === 'Microfinancier') && status === 'premium') {
                    redirectUrl = 'https://moneyhive-mw.com/business/index.html';
                } else if ((category === 'Micro Lender' || category === 'Microfinancier') && status === 'freemium') {
                    redirectUrl = 'https://moneyhive-mw.com/free-business/index.html';
                } else if (category === 'general' && status === 'premium') {
                    redirectUrl = 'https://moneyhive-mw.com/general/index.html';
                } else if (category === 'general' && status === 'freemium') {
                    redirectUrl = 'https://moneyhive-mw.com/free-general/index.html';
                } else if (category === 'Investor' && status === 'premium') {
                    redirectUrl = 'https://moneyhive-mw.com/investor/index.html';
                } else if (category === 'Investor' && status === 'freemium') {
                    redirectUrl = 'https://moneyhive-mw.com/free-investor/index.html';
                }

                if (redirectUrl) {
                    // Append user data as a query parameter
                    redirectUrl += `?userData=${encodeURIComponent(JSON.stringify(user))}`;

                    // Redirect to the determined URL
                    return res.redirect(redirectUrl);
                } else {
                    // Default redirect if no matching conditions
                    return res.redirect('https://moneyhive-mw.com/index.html');
                }
            } else {
                return res.redirect('https://moneyhive-mw.com/index.html');
            }
        }
    });
});


//Submit reviews
app.post("/api/users/reviews", (req, res) => {
    const formData = req.body;
    const userId = formData.userID;
    const username = formData.username;
    const companyID = formData.companyID;
    const companyName = formData.companyName;
    const review = formData.review;
    const created = formData.created;



    // Perform user update logic (insert data into the database)
    const query = "INSERT INTO reviews (userId, userName, companyId, companyName, review, date) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [userId, username, companyID, companyName, review, created];

    db.query(query, values, (error, results) => {
        if (error) {
           // console.error("Error inserting review request:", error);
            res.status(500).json({ message: "Error inserting delete request" });
        } else {
            //console.log("review inserted successfully");
            res.status(200).json({ message: "review inserted successfully" });
        }
    });
});

//Send inquiry email
app.post('/contact/inquiry', (req, res) => {
    const formData = req.body;
    let targetMail = formData.targetMail;



    // Print the received form data and verification code in the console
    //console.log('Received Form Data:', formData);


    // Construct the email message using the form data and generated code
    const ms = {
        to: `${formData.targetMail}`,
        from: 'info@moneyhive-mw.com',
        subject: 'Inquiry About Your Services',
        text: 'Inquiry',
        html: `
        <strong>Dear our valued customer, you have recieved an inquiry from our user about your services, below are the details :</strong> <br>
        From : ${formData.Name}<br>
        Email Address : ${formData.email}<br>
        Phone : ${formData.phone}<br>
        Message : ${formData.message}<br>
        We at Moneyhive appreciate your services on our platform, good day!<br><br><br>
        Support
      `,
    };

       

    sgMail
        .send(ms)
        .then(() => {
            console.log('Email sent');
            res.status(200).json({ message: "Mail sent" });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ message: "Error" });
        });
});
// Handle both GET and POST requests for logout
// Handle both GET and POST requests for logout

app.all('/auth/logout', (req, res) => {
    // Destroy the session on logout
    req.session.destroy((err) => {
        if (err) {
           // console.error('Error destroying session:', err);
        } else {
            // Redirect to a logged-out page
            return res.redirect('https://moneyhive-mw.com/index.html');
        }
    });
});

// API endpoint to send a message
app.post('/send_message', (req, res) => {
  const { sender_id, receiver_id, sender_name,content } = req.body;
  const query = 'INSERT INTO messages (sender_id, receiver_id, name, content) VALUES (?, ?, ?, ?)';
  db.query(query, [sender_id, receiver_id, sender_name,content], (err, result) => {
    if (err) {
     // console.error('Error sending message:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Message sent' });
    }
  });
});

// API endpoint to get messages for a user
app.get('/get_messages/:user_id', (req, res) => {
  const user_id = req.params.user_id;
  const query = 'SELECT * FROM messages WHERE receiver_id = ? ORDER BY id DESC';

  db.query(query, [user_id], (err, result) => {
    if (err) {
      console.error('Error getting messages:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(result);
    }
  });
});

// Update messages as read
// Update messages as read
app.put('/mark_as_read/:message_id', (req, res) => {
  const message_id = req.params.message_id;
  const query = 'UPDATE messages SET is_read = true WHERE id = ?';
  db.query(query, [message_id], (err, result) => {
    if (err) {
      //console.error('Error marking message as read:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Message marked as read' });
    }
  });
});


app.get('/get_chat_history/:user1/:user2', (req, res) => {
  const user1 = req.params.user1;
  const user2 = req.params.user2;

  const query = `
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY id ASC`;
  
  db.query(query, [user1, user2, user2, user1], (err, result) => {
    if (err) {
      //console.error('Error getting chat history:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(result);
    }
  });
});

app.delete('/end_chat/:userId/:receiverId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const receiverId = parseInt(req.params.receiverId);
  
    try {
      // Delete messages associated with the chat
      await db.promise().execute(
        'DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
        [userId, receiverId, receiverId, userId]
      );
  
      res.json({ success: true, message: 'Chat ended successfully' });
    } catch (error) {
      //console.error('Error ending chat:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
//business profiles
//create a business profile


// set port, listen for requests
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
    console.log(sendgridApiKey);
});