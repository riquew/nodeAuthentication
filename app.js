require('dotenv').config()
const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const secret = process.env.SECRET;

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersDB", { useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});

const postSchema = new mongoose.Schema({
    userId: String,
    postContent: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user);
  });
   
passport.deserializeUser(function(user, done) {
    done(null, user);
  });
  

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', (req, res)=> {
    res.render('home');
});

app.get('/auth/google', 
    passport.authenticate("google", {scope: ['profile']})
);

app.get('/auth/google/secrets',
    passport.authenticate("google", {failureRedirect: '/login'}) ,
    function(req, res) {
        res.redirect('/secrets')
    }
);

app.get('/auth/facebook', 
    passport.authenticate("facebook")
);

app.get('/auth/facebook/secrets',
    passport.authenticate("facebook", {failureRedirect: '/login'}) ,
    function(req, res) {
        res.redirect('/secrets')
    }
);

app.route('/login')
    .get(function(req, res) {
        res.render('login');
    })
    .post(passport.authenticate('local'), async function(req, res) {
        passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
    })
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });


app.route('/register') 
    .get(function(req, res) {
        res.render('register');
    })

    .post(function(req, res) {

        User.register({username: req.body.username}, req.body.password, function(err, user) {
            if(err) {
                res.redirect('/register');
            } else {
                passport.authenticate('local') (req, res, function() {
                    res.redirect('/secrets');
                });
            }
        });
    })

app.get('/secrets', async function(req, res) {
    if(req.isAuthenticated()){
        const userSecrets = await Post.find({userId: req.user._id})
        res.render('secrets', {userSecrets:userSecrets});
    } else {
        res.redirect('/login');
    }
})

app.route('/submit')
    .get(function(req, res) {
        if(req.isAuthenticated()) {
            res.render('submit');
        } else {
            res.redirect('/login')
        }
    })
    .post(async function(req, res) {
        const newPost = new Post({
            userId: req.user._id,
            postContent: req.body.secret
        })
        try {
            await newPost.save();
            res.redirect('/secrets');
        } catch {
            res.send(error);
        }
        
});


app.listen(port, function() {
    console.log(`Server started on port ${port}`);
});