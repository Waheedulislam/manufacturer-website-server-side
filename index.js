const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;


//meddleWare
app.use(express.json())
app.use(cors())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { response } = require('express');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4c8oglv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
        if (error) {
            return res.status(403).send({ massage: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        console.log('mongo is running');

        const productCollection = client.db("tools").collection("products");
        const addOrdersCollection = client.db("tools").collection("addOrders");
        const usersCollection = client.db("tools").collection("users");
        const reviewsCollection = client.db("tools").collection("reviews");


        // all product
        app.get('/item', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const item = await cursor.toArray();
            res.send(item);
        })
        //one product
        app.get('/itemPurchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await productCollection.findOne(query);
            res.send(item);
        })
        //users
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' }
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                res.status(403).send({ message: 'forbidden' })
            }

        })

        //JWT 
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            // token
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })



        // dashboard item
        app.get('/itemOrder/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            console.log('decoded', decodedEmail);
            if (decodedEmail === email) {
                const query = { email: email };
                const bookings = await addOrdersCollection.find(query).toArray();
                return res.send(bookings);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' });
            }


        });

        //post add product
        app.post('/item', async (req, res) => {
            const addProduct = req.body;
            const result = await productCollection.insertOne(addProduct)
            res.send(result);
        });

        //post review
        app.post('/review', async (req, res) => {
            const addReviews = req.body;
            const result = await reviewsCollection.insertOne(addReviews)
            res.send(result);
        });

        app.get('/review', async (req, res) => {
            const query = {};
            const reviews = await reviewsCollection.find(query).toArray();
            res.send(reviews);
        })
        //post
        app.post('/itemOrder', async (req, res) => {
            const addOrder = req.body;
            const result = await addOrdersCollection.insertOne(addOrder)
            res.send(result);
        });

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Heroku is Running Server')
});
app.listen(port, () => {
    console.log('server is Running');
})