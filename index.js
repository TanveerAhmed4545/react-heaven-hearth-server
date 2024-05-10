const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app =express();
const port = process.env.PORT || 5000;





// middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dc9spgo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const roomCollection = client.db("heavenHearth").collection('rooms');
    // const bookingCollection = client.db("heavenHearth").collection('booking');

    app.get('/rooms',async(req,res)=>{
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = parseInt(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const query = { price: { $gte: minPrice, $lte: maxPrice } };
        const rooms = await roomCollection.find(query).toArray();
        res.json(rooms);
    })

    // get room details by id

    app.get('/rooms/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await roomCollection.findOne(query);
        res.send(result);
    })



    // booking data patch

    app.patch('/booking/:id',async(req,res)=>{
        const id = req.params.id;
        // console.log(id);
        const bookData = req.body;
        // console.log(bookData);
        const query = {_id: new ObjectId(id)}
        const options = { upsert: true };
        const updateDoc={
            $set: {
                email: bookData.email,
                availability: bookData.availability,
                date: bookData.date

            }
          }
        const result = await roomCollection.updateOne(query,updateDoc,options);
        res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/',(req,res)=>{
    res.send('Heaven is running');
})

app.listen(port,()=>{
    console.log(`Heaven Hearth server is running on port ${port}`);
})