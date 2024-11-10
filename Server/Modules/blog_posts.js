const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/posting', async (request, response) => {
    const { description, imageBase64, created_at, user_id } = request.body;

    if (!description || !imageBase64 || !user_id) {
        return response.status(400).json({ error: 'Description, image, and user ID are required' });
    }

    const createdAt = created_at ? created_at : new Date();

    const query = `INSERT INTO blog_posts (description, image, created_at, user_id) VALUES (?, ?, ?, ?)`;

    let connection;
    try {
        connection = await pool.getConnection();

        const [result] = await connection.execute(query, [description, imageBase64, createdAt, user_id]);

        connection.release();

        response.status(201).json({ id: result.insertId, message: 'Blog post created successfully' });
    } catch (error) {
        console.error('Error inserting blog post:', error);

        if (connection) connection.release();

        response.status(500).json({ error: 'An error occurred while creating the blog post', details: error });
    }
});
router.get('/blog_view', async (request, response) => {
    const userId = request.query.userId; 
    try {
        const [results] = await pool.query(`
            SELECT 
                users.name,
                blog_posts.created_at, 
                blog_posts.description, 
                blog_posts.postsid, 
                blog_posts.image, 
                COUNT(DISTINCT post_likes.user_id) AS likes,                 
                GROUP_CONCAT(DISTINCT comments.comment SEPARATOR ', ') AS comments,  
                EXISTS(SELECT * FROM post_likes WHERE user_id = ? AND post_id = blog_posts.postsid) AS hasLiked
            FROM 
                blog_posts 
            INNER JOIN 
                users ON blog_posts.user_id = users.userid 
            LEFT JOIN 
                comments ON blog_posts.postsid = comments.post_id 
            LEFT JOIN 
                post_likes ON blog_posts.postsid = post_likes.post_id
            GROUP BY 
                blog_posts.postsid
        `, [userId]); 

        const formattedResults = results.map(post => ({
            ...post,
            comment: post.comments ? post.comments.split(', ') : []
        }));
        response.json(formattedResults);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        response.status(500).json({ message: 'Error fetching blog posts', error });
    }
});





module.exports = router;
