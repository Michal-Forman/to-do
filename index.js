//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const {mongo} = require("mongoose");
const _ = require("lodash");

// Old code
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

/*// Connect to Database - old
mongoose.connect("mongodb://127.0.0.1:27017/todolistDB")*/

// Newly added
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

// Create DB Schema
const itemsSchema = {
    name: String
};

// Create DB Model
const Item = mongoose.model("item", itemsSchema);

// Create DB Documents
const item1 = new Item({
    name: "Welcome to your to-do list"
});

const item2 = new Item({
    name: "Hit plus button to add a Item"
});

const item3 = new Item({
    name: "<-- Hit this to delete a Item"
});

const defaultItems = [item1, item2, item3];

// Custom list model
const listSchema = {
    name: String,
    items: [itemsSchema]
}

const List = mongoose.model("List", listSchema);

// Get Requests
app.get("/", function (req, res) {
    // DB.find() docs
    const query = Item.find({});

    // Execute the query and handle the result
    query.exec()
        .then((foundItems) => {
            // Access the foundItems array here
            // Check if any data exists
            if (foundItems.length === 0) {
                // Insert Array to DB
                Item.insertMany(defaultItems)
                    .then(function () {
                        console.log("Successfully saved defult items to DB");
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                res.redirect("/");
            } else {
                res.render("list", {listTitle: "Today", newListItems: foundItems});
            }
        })
        .catch((err) => {
            console.error(err);
            // Handle the error
        });
});

app.get("/:customListName", function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    List.findOne({name: customListName})
        .then((result) => {
            if (result) {
                res.render("list", {listTitle: result.name, newListItems: result.items});
                // Handle the matching documents
            } else {
                const list = new List({
                    name: customListName,
                    items: defaultItems
                })

                list.save();
                res.redirect(req.originalUrl);
                // Handle when no documents match the criteria
            }
        })
        .catch((error) => {
            console.error('Error retrieving documents:', error);
        });
});

app.post("/", async function (req, res) {
    const listName = req.body.list;
    const itemName = req.body.newItem;

    // Create new DB document
    const item = new Item({
        name: itemName
    });

    if (listName === "Today") {
        await item.save();
        res.redirect("/");
    } else {
        try {
            const foundList = await List.findOne({name: listName});
            foundList.items.push(item);
            await foundList.save();
            res.redirect(req.headers.referer);
        } catch (err) {
            console.error(err);
            res.status(500).send("An error occurred");
        }
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

/* - old
app.listen(3000, function () {
    console.log("Server started on port 3000");
});*/

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on ${PORT}`);
    })
});
