const firebase = require('firebase')
const functions = require('firebase-functions');
const express = require('express');
const app = express();
const {postOneScream, getAllScreams, getScream} = require('./handlers/screams')
const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users')
const FBAuth = require('./util/fbAuth')
const config = require('./util/config')


//Scream routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);

//User routes
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)


exports.api = functions.https.onRequest(app);