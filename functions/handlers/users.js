const {db, admin, storage} = require('../util/admin')
const firebase = require('firebase')
const config = require('../util/config')
firebase.initializeApp(config)
const {validateSignUpData, validateLoginData, reduceUserDetails} = require('../util/validators')


//signup
exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
    //destructoring
    const {valid ,errors} = validateSignUpData(newUser) 

    if(!valid) return res.status(400).json(errors);

    const noImg ='no-img.png'

    //validation ^
    let token, userId
    db.doc(`/users/${newUser.handle}`).get()
    .then((doc) => {
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
            email: newUser.email,
            createdAt: new Date().toISOString(),
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
                config.storageBucket
            }/o/${noImg}?alt=media`,
            userId
        };
       return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch((err) => {
        console.error(err)
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({email: "Email is already in use"})
        } else {
        return res.status(500).json({general: 'something went wrong, please try again'});
        }
    })
}
//user login
exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const {valid ,errors} = validateLoginData(user) 

    if(!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email.trim(), user.password)
    .then((data) => {
        return data.user.getIdToken();
    })
    .then((token) => {
        return res.json({token})
    })
    .catch((err) => {
        console.error(err)
        
        return res.status(403).json({general: 'Wrong credentials please try again'})
       
    })
}

//add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({message: 'Details added'})
        })
        .catch(err => {
            return res.status(500).json({error: err.code})
        })
}


//get any user details
exports.getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.user = doc.data();
          return db
            .collection('screams')
            .where('userHandle', '==', req.params.handle)
            .orderBy('createdAt', 'desc')
            .get();
        } else {
          return res.status(404).json({ error: 'User not found' });
        }
      })
      .then((data) => {
        userData.screams = [];
        data.forEach((doc) => {
          userData.screams.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            screamId: doc.id
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };

//get own user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          return db
            .collection('likes')
            .where('userHandle', '==', req.user.handle)
            .get();
        }
      })
      .then((data) => {
        userData.likes = [];
        data.forEach((doc) => {
          userData.likes.push(doc.data());
        });
        return db
          .collection('notifications')
          .where('recipient', '==', req.user.handle)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();
      })
      .then((data) => {
        userData.notifications = [];
        data.forEach((doc) => {
          userData.notifications.push({
            recipient: doc.data().recipient,
            sender: doc.data().sender,
            createdAt: doc.data().createdAt,
            screamId: doc.data().screamId,
            type: doc.data().type,
            read: doc.data().read,
            notificationId: doc.id
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };
//image upload
exports.uploadImage = (req, res) => {
    const BusBoy = require("busboy")
    if (req.method !== "POST") {
        // Return a "method not allowed" error
        return res.status(405).end();
      }

    const busboy = new BusBoy({headers: req.headers});
    const path = require('path')
    const os = require('os')
    const fs = require('fs')

   
    let imageToBeUploaded = {}
    let imageFileName

    busboy.on("error", function(err) {
        console.log("BUSBOY ERROR CATCH:", err);
      });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype)=>{

        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }

    file.on("error", function(err) {
        console.log("FS_STREAM ERROR CATCH:", err);
      });

        //image.png ...splitting the string by dots to pull file type
        const imageExtension = filename.split('.')[filename.split('.').length - 1] //index of last item png
        imageFileName = `${Math.round(
            Math.random() * 1000000000000
          ).toString()}.${imageExtension}`;
          console.log(imageFileName)
          

        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded= { filepath, mimetype}
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream) //this creates the file
        file.on('error', (err) => console.log("WRITE_STREAM ERROR CATCH:", err));
  
    })

    busboy.on('finish', () => { //finisher method 
        storage
        .bucket(config.storageBucket)
        .upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        }) 
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
          config.storageBucket
        }/o/${imageFileName}?alt=media`
            return db.doc(`/users/${req.user.handle}`).update({imageUrl: imageUrl});
        })
        .then(() =>{
            return res.json({message: 'image uploaded successfully'})
        })
        .catch((err) =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
    });
    busboy.end(req.rawBody);
}

exports.markNotificationsRead = (req, res) => {
    let batch = db.batch()
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`)
        batch.update(notification, {read: true})
    })
    batch.commit()
    .then(() => {
        return res.json({message: 'Notifications marked as read'})
    })
    .catch(err => {
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}