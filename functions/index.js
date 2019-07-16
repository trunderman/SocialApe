const firebase = require('firebase')
const{ db } = require('./util/admin')
const functions = require('firebase-functions');
const express = require('express');
const app = express();
const {postOneScream, getAllScreams, getScream, commentOnScream, likeScream, unlikeScream, deleteScream} = require('./handlers/screams')
const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users')
const FBAuth = require('./util/fbAuth')
const config = require('./util/config')


//Scream routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId/', FBAuth, deleteScream)
app.post('/scream/:screamId/comment', FBAuth, commentOnScream)
app.get('/scream/:screamId/like', FBAuth, likeScream)
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream)

//User routes
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)


exports.api = functions.https.onRequest(app);
exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then(doc => {
            if(doc.exists){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    screamId: doc.id,
                    type: 'like',
                    read: false
                })
            }
        })
        .then(() => {
            return
        })
        .catch(err => {
            console.error(err)
            return     
        }) 
    })
//needs refined
    exports.deleteNotificationOnUnlike = functions.firestore.document('like/{id}')
    .onDelete((snapshot) => {
            db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .then(() =>{
                return
            })
            .catch(err => {
                console.error(err)
                return
            })
    })

    exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then(doc => {
            if(doc.exists){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    screamId: doc.id,
                    type: 'comment',
                    read: false
                })
            }
        })
        .then(() => {
            return
        })
        .catch(err => {
            console.error(err)
            return     
        }) 
    })

