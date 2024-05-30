const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app =express();
const port = process.env.PORT || 5000;





// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://react-haven-hearth.web.app',
    'https://react-haven-hearth.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dc9spgo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// const logger = (req,res,next) =>{
//   console.log('log: info',req.method,req.url);
//   next();
// }

const verifyToken = (req,res,next) =>{
  const token = req.cookies?.token;
  // console.log('token in the middle ware',token)
  // no token available
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })

}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const roomCollection = client.db("heavenHearth").collection('rooms');
    const reviewsCollection = client.db("heavenHearth").collection('reviews');
    const bookingCollection = client.db("heavenHearth").collection('booking');
    const paymentCollection = client.db("heavenHearth").collection("payments");



    // jwt 
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      // console.log("user for token" , user);
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET ,{expiresIn: '1h'})

      res
      .cookie('token',token,{
        httpOnly: true,
        // secure: true,
        // sameSite: 'none'
        secure: process.env.NODE_ENV === 'production'? true : false ,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({success: true})
    })

    app.post('/logout',async(req,res)=>{
      const user = req.body;
      console.log("logging out",user)
      res
      .clearCookie('token',{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'? true : false ,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      })
      .send({success: true})
    })


// rooms related
    app.get('/rooms',async(req,res)=>{
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = parseInt(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        // const query = { price: { $gte: minPrice, $lte: maxPrice } , availability: 'yes' };
        const query = { price: { $gte: minPrice, $lte: maxPrice }};
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



    // // get all booking by specific user

    // app.get('/my-books/:email',verifyToken,async(req,res)=>{
    //   const tokenEmail = req.user.email;
    //   const email = req.params.email;
    //   if(tokenEmail !== email ){
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }  
    //     const query = {email: email}
    //     const result = await roomCollection.find(query).toArray()
    //     res.send(result)
    //   })


      // featured rooms
      app.get('/room',async(req,res)=>{
        const cursor = roomCollection.find();
        const result = await cursor.toArray();
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
                // email: bookData.email,
                availability: bookData.availability,
                // date: bookData.date

            }
          }
        const result = await roomCollection.updateOne(query,updateDoc,options);
        res.send(result);
    })


  
    


    // handle cancel

    app.patch('/booking-cancel/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const options = { upsert: true };
        const updateDoc={
            $set: {
                
                availability: 'yes',
                

            }
          }
        const result = await roomCollection.updateOne(query,updateDoc,options);
        res.send(result);
    })


    // review get 

    app.get('/reviews',async(req,res)=>{
      const cursor = reviewsCollection.find().sort({ timestamp: -1 });
      const result = await cursor.toArray();
      res.send(result);
    })



    // review add

    app.post('/reviews',verifyToken,async(req,res)=>{
      const {userName,roomId,userRating,userComment,timestamp,userPhoto } = req.body;
      const newReview = { userName,roomId,userRating,userComment, timestamp,userPhoto };
      // console.log(newReview);
      const result = await reviewsCollection.insertOne(newReview);
      res.send(result);
  })



  // booking post
  app.post('/booking-post',async(req,res)=>{
    const newBooking = req.body;
    const result = await bookingCollection.insertOne(newBooking);
    res.send(result);
})

// get  for reviews
app.get('/booking-review/:id',async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await bookingCollection.findOne(query);
  res.send(result);
})

 // get all booking by specific user

 app.get('/my-booking/:email',verifyToken,async(req,res)=>{
  const tokenEmail = req.user.email;
  const email = req.params.email;
  if(tokenEmail !== email ){
    return res.status(403).send({ message: 'forbidden access' })
  }  
    const query = {email: email}
    const result = await bookingCollection.find(query).toArray()
    res.send(result)
  })


   // booking update

   app.patch('/book-update/:id',async(req,res)=>{
    const id = req.params.id;
    // console.log(id);
    const bookData = req.body;
    // console.log(bookData);
    const query = {_id: new ObjectId(id)}
    const options = { upsert: true };
    const updateDoc={
        $set: {
            date: bookData.date

        }
      }
    const result = await bookingCollection.updateOne(query,updateDoc,options);
    res.send(result);
})

// delete
app.delete('/booking-delete/:id',async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await bookingCollection.deleteOne(query);
  res.send(result);
})

// payment
app.post('/create-payment-intent',async(req,res)=>{
  const {price} = req.body;
  const amount = parseInt(price * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  })

  res.send({
    clientSecret: paymentIntent.client_secret,
  })

})


// // payment data

app.post('/payments',async(req,res)=>{
  
try {
const payment = req.body;
const paymentResult = await paymentCollection.insertOne(payment);

console.log('payment info', payment);

const query = {
  _id: {
    $in: payment.bookIds.map(id => new ObjectId(id))
  }
};

const deleteResult = await bookingCollection.deleteMany(query);

// Combine the results into a single response object
const response = {
  paymentResult
};

 res.status(200).send(response);
} catch (error) {
console.error('Error processing payment:', error);
res.status(500).json({ error: 'Internal Server Error' });
}
});


app.get('/payments/:email',verifyToken,async(req,res)=>{
  const query = {email: req.params.email}
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
})





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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