const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/posting', async (request, response) => {
    const { title, description, imageBase64, user_id } = request.body;

    if (!title || !description || !imageBase64 || !user_id) {
        return response.status(400).json({ error: 'Title, description, image, and user ID are required' });
    }

    const query = `INSERT INTO blog_posts (title, description, image, user_id) VALUES (?, ?, ?, ?)`;

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(query, [title, description, imageBase64, user_id]);
        connection.release();
        response.status(201).json({ id: result.insertId, message: 'Blog post created successfully' });
    } catch (error) {
        console.error('Error inserting blog post:', error);
        response.status(500).json({ error: 'An error occurred while creating the blog post', details: error });
    }
});

module.exports = router;
