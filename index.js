//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const {mongo} = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");

// Set up express
const app = express();

// Set up flash
app.use(flash());

// Set up session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            done(null, user);
        })
        .catch((err) => {
            done(err, null);
        });
});

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Define the passport.js authentication strategy
passport.use(new localStrategy({
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email, password, done) => {
            try {
                const user = await User.findOne({email: email});
                if (!user) {
                    return done(null, false, {message: 'Incorrect email or password.'});
                }
                if (!user.isValidPassword(password)) {
                    return done(null, false, {message: 'Incorrect email or password.'});
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);


// connect to MongoDB
const PORT = process.env.PORT || 3000;
mongoose.set("strictQuery", false);
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

// Items Schema
const itemsSchema = {
    name: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
};

// Items Model
const Item = mongoose.model("item", itemsSchema);

// Declare default items
defaultItems = [];

// Custom list Schema
const listSchema = {
    name: String,
    items: [itemsSchema],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
};

// Custom list Model
const List = mongoose.model("List", listSchema);

// User Schema
const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String
});

// Add isValidPassword method to the userSchema
userSchema.methods.isValidPassword = function (password) {
    // Compare the provided password with the stored password
    return password === this.password;
};

// User Model
const User = mongoose.model("User", userSchema);

// Create first users
async function createUser1() {
    const existingUsers = await User.find({email: "miska.forman@gmail.com"});

    if (existingUsers.length === 0) {
        const user1 = new User({
            firstName: "Miska",
            lastName: "Forman",
            email: "miska.forman@gmail.com",
            password: "Miska123"
        });

        await user1.save();
        console.log("User created successfully.");
    } else {
        console.log("User already exists.");
    }
}

async function createUser2() {
    const existingUsers = await User.find({email: "miska.forman@gmail.com"});

    if (existingUsers.length === 0) {
        const user2 = new User({
            firstName: "m",
            lastName: "Forman",
            email: "mforman@outlook.cz",
            password: "Miska123"
        });

        await user2.save();
        console.log("User created successfully.");
    } else {
        console.log("User already exists.");
    }
}

createUser1();
createUser2();

// Get Requests
app.get("/", isAuthenticated, function (req, res) {
    const userId = req.user._id;

    Item.find({ user: userId })
        .then((foundItems) => {
            res.render("list", { listTitle: "Today", newListItems: foundItems });
        })
        .catch((err) => {
            console.error(err);
            // Handle the error
        });
});


function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/drop', isAuthenticated, async (req, res) => {
    const userId = req.user._id;

    try {
        // Delete items associated with the user
        await Item.deleteMany({ user: userId });
        console.log('Dropped items associated with the user');

        // Delete lists associated with the user
        await List.deleteMany({ user: userId });
        console.log('Dropped lists associated with the user');

        res.redirect("/");
    } catch (err) {
        console.log('Error dropping items and lists:', err);
        res.status(500).send('An error occurred');
    }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        // Check if a user with the provided email already exists
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            // User with the provided email already exists
            // Handle the error or display an appropriate message
            console.log("User already exists");
            return res.redirect("/register");
        }

        // Create a new user
        const newUser = new User({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password
        });

        // Save the new user to the database
        await newUser.save();

        // Redirect to the login page or any other desired page
        res.redirect("/login");
    } catch (err) {
        console.error(err);
        // Handle the error or display an appropriate message
        res.redirect("/register");
    }
});

app.get("/profile" , isAuthenticated, (req, res) => {
    const userId = req.user._id;

    Item.find({ user: userId })
        .then((foundItems) => {
            res.render("profile", {firstName: req.user.firstName , lastName: req.user.lastName, email: req.user.email, password: req.user.password});
        });
});
app.get("/login", (req, res) => {
    // Render the login form
    res.render("login.ejs");
});
app.get("/logout", (req, res) => {
    req.logout(function(err) {
        if (err) {
            console.log(err);
        }
    }); // This will log out the user
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.redirect("/");
});
app.get("/change_password", isAuthenticated, (req, res) => {
    res.render("change_password");
});
app.get("/:customListName", isAuthenticated, function (req, res) {
    const customListName = _.capitalize(req.params.customListName);
    const userId = req.user._id;

    List.findOne({ name: customListName, user: userId })
        .then((result) => {
            if (result) {
                res.render("list", { listTitle: result.name, newListItems: result.items });
            } else {
                const list = new List({
                    name: customListName,
                    items: defaultItems,
                    user: userId
                });

                list.save();
                res.redirect(req.originalUrl);
            }
        })
        .catch((error) => {
            console.error('Error retrieving documents:', error);
        });
});


app.post("/", async function (req, res) {
    const listName = req.body.list;
    const itemName = req.body.newItem;
    const userId = req.user._id;

    if (itemName.length > 0) {
        const item = new Item({
            name: itemName,
            user: userId
        });

        if (listName === "Today") {
            await item.save();
            res.redirect("/");
        } else {
            try {
                const foundList = await List.findOne({ name: listName, user: userId });
                foundList.items.push(item);
                await foundList.save();
                res.redirect(req.headers.referer);
            } catch (err) {
                console.error(err);
                res.status(500).send("An error occurred");
            }
        }
    } else {
        // Handle if tried to add a blank string
        console.log("forbidden");
        res.redirect(req.headers.referer);
    }
});



app.post("/delete", function (req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "Today") {
        // Action to be performed after the delay
        Item.findByIdAndRemove(checkedItemId)
            .then((removedItem) => {
                if (removedItem) {
                } else {
                    console.log('Item not found');
                }
            })
            .catch((err) => {
                console.error(err);
                // Handle the error
            });
        res.redirect("/");
    } else {
        List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}})
            .then(() => res.redirect(req.headers.referer))
            .catch((err) => {
                console.log(err);
            });
    }
})

app.get("/work", function (req, res) {
    res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function (req, res) {
    res.render("about");
});


connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on ${PORT}`);
    })
});
