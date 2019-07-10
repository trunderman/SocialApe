const {db, admin} = require('../util/admin')

exports.getAllScreams = (request, response) => {
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

}

exports.postOneScream = (request, response) => {
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
  }

 
exports.getScream = (req, res) => {
    let screamData = {};
    db.doc(`/screams/${req.params.screamId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return db
          .collection('comments')
          //.orderBy('createdAt', 'desc')
          .where('screamId', '==', req.params.screamId)
          .get()
          console.log(db.collection('comments'))
      })

      .then(data => {
        screamData.comments = [];
        data.forEach((doc) => { 
          screamData.comments.push(doc.data());
        });
        console.log(screamData)
        return res.json(screamData);
      })
   
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  }