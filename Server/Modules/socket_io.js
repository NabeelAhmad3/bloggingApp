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
        console.log('user connected:', socket.id);

        socket.on('likePost', (postId) => {
            pool.query(
                'UPDATE blog_posts SET likes = likes + 1 WHERE postsid = ?',
                [postId],
                (error) => {
                    if (error) {
                        console.error('Error updating likes:', error);
                        return;
                    }
                    pool.query('SELECT likes FROM blog_posts WHERE postsid = ?', [postId], (error, rows) => {
                        if (error) {
                            console.error('Error fetching updated likes:', error);
                            return;
                        }
                        const updatedLikes = rows[0]?.likes || 0;
                        io.emit('likeUpdate', { postsid: postId, likes: updatedLikes });
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
                        return;
                    }
                    io.emit('commentUpdate', { id: postId, comment: comment });
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
