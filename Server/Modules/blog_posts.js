const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/posting', async (request, response) => {
    const { title, description, imageBase64, created_at, user_id } = request.body;

    if (!title || !description || !imageBase64 || !user_id) {
        return response.status(400).json({ error: 'Title, description, image, and user ID are required' });
    }

    const createdAt = created_at ? created_at : new Date();

    const query = `INSERT INTO blog_posts (title, description, image, created_at, user_id) VALUES (?, ?, ?, ?, ?)`;

    let connection;
    try {
        connection = await pool.getConnection();

        const [result] = await connection.execute(query, [title, description, imageBase64, createdAt, user_id]);

        connection.release();

        response.status(201).json({ id: result.insertId, message: 'Blog post created successfully' });
    } catch (error) {
        console.error('Error inserting blog post:', error);

        if (connection) connection.release();

        response.status(500).json({ error: 'An error occurred while creating the blog post', details: error });
    }
});


router.get('/blog_view', async (request, response) => {
    try {
        const [results] = await pool.query(
            'SELECT blog_posts.title, blog_posts.description, blog_posts.image,blog_posts.created_at, users.name FROM blog_posts INNER JOIN users ON blog_posts.user_id = users.userid;'
        );
        response.json(results);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        response.status(500).json({ message: 'Error fetching blog posts', error });
    }
});


module.exports = router;
