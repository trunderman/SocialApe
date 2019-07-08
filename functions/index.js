const functions = require('firebase-functions');
const admin = require('firebase-admin')
var serviceAccount = require("./serviceAccountKey");
const express = require('express');
const app = express();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape1.firebaseio.com"
  });

const config = {
    apiKey: "AIzaSyDwVIFXQYOHrjjrmQkYlcLTcd4LU1sr4sI",
    authDomain: "socialape1.firebaseapp.com",
    databaseURL: "https://socialape1.firebaseio.com",
    projectId: "socialape1",
    storageBucket: "socialape1.appspot.com",
    messagingSenderId: "38031637801",
    appId: "1:38031637801:web:957ac5d8fab69380"
  };

const firebase = require('firebase')
firebase.initializeApp(config);

const db = admin.firestore();



app.get('/screams', (request, response) => {
    db
    .collection('screams')
    .orderBy('createdAt', 'asc')
    .get()
    .then(data => {
    let screams = []
    data.forEach(doc => {
        screams.push({
            screamId: doc.id,
            body: doc.data().body,
            userHandle: doc.data().userHandle,
            createdAt: doc.data().createdAt
        });
    });
    return response.json(screams);
})
.catch(err => console.error(err))

})

const FBAuth = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found')
        return res.status(403).json({error: 'Unauthorized'})
    }

    admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
        req.user = decodedToken
        console.log(decodedToken)
        return db.collection('users')
            .where('userId', '==', req.user.uid)
            .limit(1)
            .get()
    })
    .then(data => {
        req.user.handle = data.docs[0].data().handle;
        return next();
    })
    .catch(err => {
        console.log('Error while verifying token', err);
        return res.status(403).json(err);
    })
}

app.post('/scream', FBAuth, (request, response) => {
  const newScream = {
      body: request.body.body,
      userHandle: request.user.handle,  
      createdAt: new Date().toISOString()
  };

  db
    .collection('screams')
    .add(newScream)
    .then(doc => {
      response.json({message: `document${doc.id} created successfully`})
    })
    .catch((err) => {
        response.status(500).json({error: `something went wrong`});
        console.error(err);
    })
});

//string validation
const isEmpty = (string) => {
    if (string.trim() === '') return true 
    else return false;
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)) return true;
    else return false;
}

//signup route

app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
    //errors object must be empty to proceed, if not calls wont go through
    let errors = {}; 

    if(isEmpty(newUser.email)){
        errors.email = 'must not be empty'
    } 
    // else if(!isEmail(newUser.email)){
    //     errors.email = 'must be a valid email address'
    // }

    if(isEmpty(newUser.password)) errors.password = "must not be empty"
    if(newUser.password != newUser.confirmPassword) errors.confirmPassword = 'Passwords must match'
    if(isEmpty(newUser.handle)) errors.handle = "must not be empty"

    if(Object.keys(errors).length > 0) return res.status(400).json({errors})

    //validation ^
    let token, userId
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({handle: 'this handle is already taken'})
        } else {
           return firebase.auth().createUserWithEmailAndPassword(newUser.email.trim(), newUser.password)
        }
    })
    .then((data) => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then((idToken) => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            emai: newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };
       return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch(err => {
        console.error(err)
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({email: "Email is already in use"})
        } else {
        return res.status(500).json({error: err.code});
        }
    })
})

//login functionality

app.post('/login',(req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let errors = {}

    if(isEmpty(user.email)) errors.email = 'Must not be empty'
    if(isEmpty(user.password)) errors.password = 'Must not be empty'

    if(Object.keys(errors) > 0) return res.status(400).json({errors})

    firebase.auth().signInWithEmailAndPassword(user.email.trim(), user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({token})
    })
    .catch(err => {
        console.error(err)
        if(err.code === 'auth/wrong-password'){
        return res.status(403).json({general: 'Wrong credentials please try again'})
        }else
        return res.status(500).json({error: err.code})
    })
})

exports.api = functions.https.onRequest(app);