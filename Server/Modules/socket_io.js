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
        console.log('user connected from backend');

        socket.on('likePost', (postId) => {
            if (!postId) {
                socket.emit('error', 'Post ID is missing or invalid');
                return;
            }

            pool.query(
                'UPDATE blog_posts SET likes = likes + 1 WHERE postsid = ?',
                [postId],
                (error) => {
                    if (error) {
                        console.error('Error updating likes:', error);
                        socket.emit('error', 'Failed to update likes');
                        return;
                    }
                    pool.query('SELECT likes FROM blog_posts WHERE postsid = ?', [postId], (error, rows) => {
                        if (error) {
                            console.error('Error fetching updated likes:', error);
                            socket.emit('error', 'Failed to fetch updated likes');
                            return;
                        }
                        const updatedLikes = rows[0]?.likes || 0;
                        io.emit('likeUpdate', { postsid: postId, likes: updatedLikes });
                    });
                }
            );
        });

        socket.on('commentPost', ({ postId, comment }) => {
            if (!postId || !comment) {
                socket.emit('error', 'Post ID or comment is missing or invalid');
                return;
            }

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
            console.log('user disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
