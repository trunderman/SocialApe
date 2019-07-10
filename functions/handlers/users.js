const {db, admin, storage} = require('../util/admin')
const firebase = require('firebase')
const config = require('../util/config')
firebase.initializeApp(config)
const {validateSignUpData, validateLoginData} = require('../util/validators')



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
        return res.status(500).json({error: err.code});
        }
    })
}

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
        if(err.code === 'auth/wrong-password'){
        return res.status(403).json({general: 'Wrong credentials please try again'})
        }else
        return res.status(500).json({error: err.code})
    })
}

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