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
            const comments = await getCommentsForPost(postId);
            io.emit('updateComments', { postId, comments });
        });

        socket.on('deleteComment', async (commentId, postId, userId) => {

            try {
                const [rows] = await pool.query(
                    'SELECT user_id FROM comments WHERE id = ? AND post_id = ?',
                    [commentId, postId]
                );

                if (rows[0].user_id !== parseInt(userId)) {
                    console.error('Unauthorized deletion attempt');
                    return socket.emit('error', { message: 'Unauthorized action' });
                }

                await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

                const comments = await getCommentsForPost(postId);
                io.emit('updateComments', { postId, comments });

            } catch (error) {
                console.error('Error deleting comment:', error);
                socket.emit('error', { message: 'Failed to delete comment' });
            }
        });
        socket.on('replyToComment', async ({ postId, parentCommentId, comment, userId }) => {
            try {
                const insertResult = await pool.query(
                    `INSERT INTO comments (post_id, parent_comment_id, comment, user_id) VALUES (?, ?, ?, ?)`,
                    [postId, parentCommentId, comment, userId]
                );
                const [idResult] = await pool.query(`SELECT LAST_INSERT_ID() AS id`);
                const replyId = idResult[0]?.id;
                const [replies] = await pool.query(
                    `SELECT * FROM comments WHERE parent_comment_id = ?`,
                    [parentCommentId]
                );
                io.emit('updateReplies', { parentCommentId, replies });
            } catch (error) {
                console.error('Error replying to comment:', error);
            }
        });


        async function getCommentsForPost(postId) {
            const [comments] = await pool.query(`
                SELECT c.id, c.user_id, c.comment, u.name AS username FROM comments c JOIN users u ON c.user_id = u.userid WHERE c.post_id =  ?`, [postId]);

            return comments.map(row => ({
                commentId: row.id,
                userId: row.user_id,
                comment: row.comment,
                username: row.username
            }));
        }

        socket.on('disconnect', () => {
            console.log('socket disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
