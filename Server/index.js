const express = require('express');
const cors = require('cors');
const http = require('http');
const pool = require('./db');
const { setupSocketIO } = require('./Modules/socket_io');
const users_endpoint = require('./Modules/users');
const blog_posts_endpoint = require('./Modules/blog_posts');

const index = express();
const port = 5000;
const server = http.createServer(index);

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
    connection.release();
});


index.use(cors());
index.use(express.json());

index.use('/users', users_endpoint);
index.use('/blog_posts', blog_posts_endpoint);

setupSocketIO(server);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
