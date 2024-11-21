const { Server } = require('socket.io');
const pool = require('../db');

function setupSocketIO(server) {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"]
        },
    });

    io.on('connection', (socket) => {
        console.log('socket connected:', socket.id);
        const userId = socket.handshake.query.userId;

        socket.on('likePost', async (postId) => {
            try {
                await pool.query(
                    'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id',
                    [userId, postId]
                );

                const [rows] = await pool.query('SELECT COUNT(*) AS totalLikes FROM post_likes WHERE post_id = ?', [postId]);
                const totalLikes = rows[0]?.totalLikes || 0;
                io.emit('likeUpdate', { postId, likes: totalLikes });
            } catch (error) {
                console.error('Error updating likes:', error);
                socket.emit('error', 'Failed to update likes');
            }
        });

        socket.on('commentPost', async ({ postId, comment }) => {
            try {
                await pool.query('INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)', [postId, userId, comment]);
                const comments = await getCommentsForPost(postId);
                io.emit('updateComments', { postId, comments });
            } catch (error) {
                console.error('Error posting comment:', error);
                socket.emit('error', 'Failed to post comment');
            }
        });

        socket.on('editComment', async ({ postId, commentId, newCommentText, userId }) => {
            if (!commentId) {
                console.error('Comment ID is missing or undefined');
                socket.emit('error', 'Invalid comment ID');
                return;
            }

            const [comment] = await pool.query('SELECT user_id FROM comments WHERE id = ? AND user_id = ?', [commentId, userId]);

            if (!comment || comment.length === 0) {
                console.error('No comment found for this user');
                socket.emit('error', 'Unauthorized action or comment not found');
                return;
            }
            await pool.query('UPDATE comments SET comment = ? WHERE id = ?', [newCommentText, commentId]);
            const [comments] = await pool.query('SELECT * FROM comments WHERE post_id = ?', [postId]);
            io.emit('updateComments', { postId, comments });
        });
        socket.on('deleteComment', async (commentId, postId, userId) => {
            if (!postId || !commentId || !userId) {
                console.log('Invalid or undefined postId, commentId, or userId:', postId, commentId, userId);
                socket.emit('commentDeleted', { success: false, message: 'Post ID, Comment ID, or User ID is missing' });
                return;
            }

            try {
                console.log('Received postId:', postId, 'and commentId:', commentId, 'and userId:', userId); // Log to confirm received data

                // First, get the post owner ID
                const postQuery = 'SELECT user_id AS postOwnerId FROM blog_posts WHERE postsid = ?';
                const [postRows] = await pool.query(postQuery, [postId]);

                if (postRows.length > 0) {
                    const postOwnerId = postRows[0].postOwnerId;
                    console.log('Post Owner ID:', postOwnerId);

                    // Now, get the comment's owner user ID
                    const commentQuery = 'SELECT user_id FROM comments WHERE id = ? AND post_id = ?';
                    const [commentRows] = await pool.query(commentQuery, [commentId, postId]);

                    if (commentRows.length > 0) {
                        const commentOwnerId = commentRows[0].user_id;
                        console.log('Comment Owner ID:', commentOwnerId);

                        // Ensure that userId, postOwnerId, and commentOwnerId are numbers before comparison
                        if (parseInt(userId) === postOwnerId || parseInt(userId) === commentOwnerId) {
                            const deleteQuery = 'DELETE FROM comments WHERE id = ? AND post_id = ?';
                            const [result] = await pool.query(deleteQuery, [commentId, postId]);

                            console.log('Delete result:', result);

                            if (result.affectedRows > 0) {
                                // Emit to all clients about the deleted comment
                                io.emit('commentDeleted', { success: true, commentId, postId });

                                // Optionally, emit a success message to the client who triggered the delete
                                socket.emit('commentDeleted', { success: true, commentId, postId });
                                console.log(`Comment with ID ${commentId} deleted from post ${postId}`);
                            } else {
                                console.log('No rows affected, comment might not exist or already deleted.');
                                socket.emit('commentDeleted', { success: false, message: 'Comment not found or already deleted' });
                            }
                        } else {
                            console.log(`User ${userId} is not authorized to delete comment on post ${postId}`);
                            socket.emit('commentDeleted', { success: false, message: 'You are not authorized to delete this comment' });
                        }
                    } else {
                        console.log('Comment not found');
                        socket.emit('commentDeleted', { success: false, message: 'Comment not found' });
                    }
                } else {
                    console.log('Post not found');
                    socket.emit('commentDeleted', { success: false, message: 'Post not found' });
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
                socket.emit('commentDeleted', { success: false, message: 'Failed to delete comment' });
            }
        });



        async function getCommentsForPost(postId) {
            const [comments] = await pool.query('SELECT id, user_id, comment FROM comments WHERE post_id = ?', [postId]);
            return comments.map(row => ({ id: row.id, userId: row.user_id, comment: row.comment }));
        }

        socket.on('disconnect', () => {
            console.log('socket disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
