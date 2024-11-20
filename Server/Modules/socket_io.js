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
        socket.on('deleteComment', async ({ postId, commentId }) => {
            try {
                const [result] = await pool.query(
                    'DELETE FROM comments WHERE id = ? AND user_id = ? AND post_id = ?',
                    [commentId, userId, postId]
                );

                if (result.affectedRows > 0) {
                    const comments = await getCommentsForPost(postId);
                    io.emit('updateComments', { postId, comments });
                } else {
                    socket.emit('error', 'Failed to delete comment or unauthorized action.');
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
                socket.emit('error', 'Failed to delete comment');
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
