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
            try {
                const commentQuery = 'SELECT user_id FROM comments WHERE id = ? AND post_id = ?';
                const [commentRows] = await pool.query(commentQuery, [commentId, postId]);

                if (commentRows.length > 0) {
                    const commentOwnerId = commentRows[0].user_id;
                    if (parseInt(userId) === commentOwnerId) {
                        const deleteQuery = 'DELETE FROM comments WHERE id = ? AND post_id = ?';
                        const [result] = await pool.query(deleteQuery, [commentId, postId]);

                        if (result.affectedRows > 0) {
                            io.emit('commentDeleted', { success: true, commentId, postId });

                            socket.emit('commentDeleted', { success: true, commentId, postId });
                        } else {
                            socket.emit('commentDeleted', { success: false, message: 'Comment not found or already deleted' });
                        }
                    } else {
                        socket.emit('commentDeleted', { success: false, message: 'You are not authorized to delete this comment' });
                    }
                } else {
                    socket.emit('commentDeleted', { success: false, message: 'Comment not found' });
                }
            } catch (error) {
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
