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

        socket.on('likePost', (postId) => {
            const userId = socket.handshake.query.userId;
            console.log('Received userId:', userId);
            if (!userId) {
                console.error('User ID is null or undefined.');
                socket.emit('error', 'User ID cannot be null');
                return;
            }

            pool.query(
                'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id',
                [userId, postId],
                (error) => {
                    if (error) {
                        console.error('Error updating likes:', error);
                        socket.emit('error', 'Failed to update likes');
                        return;
                    }
                    pool.query('SELECT COUNT(*) AS totalLikes FROM post_likes WHERE post_id = ?', [postId], (error, rows) => {
                        if (error) {
                            console.error('Error fetching updated likes:', error);
                            socket.emit('error', 'Failed to fetch updated likes');
                            return;
                        }

                        const totalLikes = rows[0]?.totalLikes || 0;
                        io.emit('likeUpdate', { postsid: postId, likes: totalLikes });
                    });
                }
            );
        });

        socket.on('commentPost', ({ postId, comment }) => {
            pool.query(
                'INSERT INTO comments (post_id, comment) VALUES (?, ?)',
                [postId, comment],
                (error) => {
                    if (error) {
                        console.error('Error inserting comment:', error);
                        socket.emit('error', 'Failed to add comment');
                        return;
                    }
                    pool.query('SELECT comment FROM comments WHERE post_id = ?', [postId], (error, rows) => {
                        if (error) {
                            console.error('Error fetching updated comments:', error);
                            socket.emit('error', 'Failed to fetch updated comments');
                            return;
                        }
                        const updatedComments = rows.map(row => row.comment);
                        io.emit('commentUpdate', { id: postId, comment: updatedComments });
                    });
                }
            );
        });

        socket.on('disconnect', () => {
            console.log('socket disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
