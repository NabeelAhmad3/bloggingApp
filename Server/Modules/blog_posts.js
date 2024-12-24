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
        blog_posts.messages,
        blog_posts.created_at, 
        blog_posts.description, 
        blog_posts.postsid, 
        blog_posts.image, 
        COUNT(DISTINCT post_likes.user_id) AS likes, 
        EXISTS(SELECT * FROM post_likes WHERE user_id = ? AND post_id = blog_posts.postsid) AS hasLiked
      FROM blog_posts 
      INNER JOIN users ON blog_posts.user_id = users.userid 
      LEFT JOIN post_likes ON blog_posts.postsid = post_likes.post_id 
      WHERE blog_posts.user_id != ? 
      GROUP BY blog_posts.postsid 
      ORDER BY blog_posts.created_at DESC
    `, [userId, userId]);

    const formattedResults = await Promise.all(results.map(async (post) => {
      const [comments] = await pool.query(`
        SELECT comments.id, comments.user_id, comments.comment, comments.replies, users.name AS username
        FROM comments
        INNER JOIN users ON comments.user_id = users.userid
        WHERE post_id = ?
      `, [post.postsid]);

      const allComments = comments.map(comment => ({
        username: comment.username,
        userId: comment.user_id,
        comment: comment.comment,
        commentId: comment.id,
        replies: JSON.parse(comment.replies || '[]').map(reply => ({
          username: reply.username,
          comment: reply.comment,
        }))
      }));

      const allMessages = JSON.parse(post.messages || '[]').map(msg => ({
        username: msg.username,
        content: msg.content,
        messageId: msg.messageId,
        replies: msg.replies.map(reply => ({
          username: reply.username,
          content: reply.content,
        })),
      }));

      return {
        ...post,
        messages: allMessages,
        comments: allComments,
      };
    }));

    response.json(formattedResults); // Send the response
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    response.status(500).json({ message: 'Error fetching blog posts', error });
  }
});

router.get('/myblog_view', async (request, response) => {
  const userId = request.query.userId;
  try {
    const [results] = await pool.query(`
      SELECT 
        blog_posts.postsid, 
        blog_posts.messages,
        blog_posts.user_id AS post_user_id, 
        users.name, 
        blog_posts.created_at, 
        blog_posts.description, 
        blog_posts.image, 
        COUNT(DISTINCT post_likes.user_id) AS likes,
        EXISTS(SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = blog_posts.postsid) AS hasLiked
      FROM blog_posts
      INNER JOIN users ON blog_posts.user_id = users.userid
      LEFT JOIN post_likes ON blog_posts.postsid = post_likes.post_id
      WHERE blog_posts.user_id = ?
      GROUP BY blog_posts.postsid
      ORDER BY blog_posts.created_at DESC
    `, [userId, userId]);

    const formattedResults = await Promise.all(results.map(async (post) => {
      const [comments] = await pool.query(`
        SELECT comments.id, comments.user_id, comments.comment,comments.replies, users.name AS username
         FROM comments 
         INNER JOIN users ON comments.user_id = users.userid
          WHERE post_id = ? `,
        [post.postsid]);

      const allComments = comments.map(comment => ({
        comment: comment.comment,
        username: comment.username,
        userId: comment.user_id,
        commentId: comment.id,
        replies: JSON.parse(comment.replies || '[]').map(reply => ({
          username: reply.username,
          comment: reply.comment,
        })),
      }));

      const allMessages = JSON.parse(post.messages || '[]').map(msg => ({
        username: msg.username,
        content: msg.content,
        messageId: msg.messageId,
        replies: msg.replies.map(reply => ({
          username: reply.username,
          content: reply.content,
        })),
      }));

      return {
        ...post,
        messages: allMessages,
        comment: allComments,
      };
    }));

    response.json(formattedResults);

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    response.status(500).json({ message: 'Error fetching blog posts', error });
  }
});

router.put('/edit_post', async (request, response) => {
  const { postId, description, imageBase64, userId } = request.body;

  const query = `UPDATE blog_posts SET description = COALESCE(?, description), image = COALESCE(?, image) WHERE postsid = ? AND user_id = ?`;

  try {
    const [result] = await pool.query(query, [description, imageBase64, postId, userId]);

    if (result.affectedRows === 0) {
      return response.status(404).json({ error: 'Post not found or you are not authorized to edit this post' });
    }

    response.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating blog post:', error);
    response.status(500).json({ error: 'An error occurred while updating the blog post', details: error });
  }
});

router.delete('/delete_post/:postId', async (request, response) => {
  const { postId } = request.params;
  const userId = request.query.userId;

  const deleteComments = `DELETE FROM comments WHERE post_id = ?`;
  const deletePost = `DELETE FROM blog_posts WHERE postsid = ? AND user_id = ?`;

  try {
    await pool.query(deleteComments, [postId]);

    const [result] = await pool.query(deletePost, [postId, userId]);

    if (result.affectedRows === 0) {
      return response.status(404).json({ error: 'Post not found or you are not authorized to delete this post' });
    }

    response.json({ message: 'Post and associated comments deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    response.status(500).json({ error: 'An error occurred while deleting the blog post', details: error });
  }
});

module.exports = router;