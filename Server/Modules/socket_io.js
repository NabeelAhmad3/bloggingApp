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
                if (!userId) {
                    throw new Error('User ID is required for liking posts');
                }
        
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
                await pool.query('INSERT INTO comments (post_id, comment) VALUES (?, ?)', [postId, comment]);
                const comments = await getCommentsForPost(postId); 
                io.emit('updateComments', { postId, comments });
            } catch (error) {
                console.error('Error posting comment:', error);
                socket.emit('error', 'Failed to post comment');
            }
        });

        async function getCommentsForPost(postId) {
            const [comments] = await pool.query('SELECT comment FROM comments WHERE post_id = ?', [postId]);
            return comments.map(row => row.comment);
        }

        socket.on('disconnect', () => {
            console.log('socket disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
