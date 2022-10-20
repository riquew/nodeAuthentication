require('dotenv').config()
const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption');


mongoose.connect("mongodb://localhost:27017/usersDB", { useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = process.env.SECRET;

userSchema.plugin(encrypt, { secret: secret , encryptedFields: ['password']});

const User = mongoose.model('User', userSchema);

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));


app.get('/', (req, res)=> {
    res.render('home');
});

app.route('/login')
    .get(function(req, res) {
    res.render('login');
})
    .post(async function(req, res) {
        const userName = req.body.username;
        const inputPassword = req.body.password;
        try {
            const docs = await User.findOne({email: userName})
            if(docs) {
                (docs.password === inputPassword) ? res.render('secrets'): res.send('wrong password')
            } else {
                res.send('user not found')
            }
        } catch(error) {
            res.send(error);
        }
    })

app.route('/register') 
    .get(function(req, res) {
        res.render('register');
    })

    .post(async function(req, res) {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        })
        try {
            await newUser.save();
            res.redirect('/');
        } catch {
            res.send(error);
        }
    })



app.listen(port, function() {
    console.log(`Server started on port ${port}`);
});