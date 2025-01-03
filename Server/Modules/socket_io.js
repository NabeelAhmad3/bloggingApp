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
        socket.on('sendMessage', async ({ postId, message, userId, userName }) => {
            try {
                const newMessage = {
                    messageId: Date.now(),
                    userId,
                    username: userName,
                    content: message,
                    replies: []
                };

                const [post] = await pool.query('SELECT messages FROM blog_posts WHERE postsid = ?', [postId]);
                const existingMessages = JSON.parse(post[0]?.messages || '[]');
                existingMessages.push(newMessage);

                await pool.query('UPDATE blog_posts SET messages = ? WHERE postsid = ?', [JSON.stringify(existingMessages), postId]);

                io.emit('newMessage', { postId, message: newMessage });
            } catch (error) {
                console.error('Error handling sendMessage:', error);
            }
        });

        socket.on('replyToMessage', async ({ postId, parentMessageId, message, userId, userName }) => {

            try {
                const [post] = await pool.query('SELECT messages FROM blog_posts WHERE postsid = ?', [postId]);
                const existingMessages = JSON.parse(post[0]?.messages || '[]');

                const parentMessage = existingMessages.find(msg => msg.messageId === parentMessageId);

                if (!parentMessage) {
                    throw new Error('Parent message not found');
                }

                const newReply = {
                    messageId: Date.now(),
                    userId,
                    username: userName,
                    content: message,
                };

                parentMessage.replies.push(newReply);

                await pool.query('UPDATE blog_posts SET messages = ? WHERE postsid = ?', [JSON.stringify(existingMessages), postId]);

                io.emit('messageReplyAdded', { parentMessageId, reply: newReply });
            } catch (error) {
                console.error('Error handling reply to message:', error);
            }
        });

        socket.on('replyToComment', async ({ parentCommentId, comment, userId, userName }) => {
            try {
                const createdAt = new Date().toISOString();
                const newReply = {
                    userId,
                    replyId: Date.now(),
                    username: userName,
                    comment,
                    createdAt,
                };

                const [existingReplies] = await pool.query(
                    `SELECT replies FROM comments WHERE id = ?`,
                    [parentCommentId]
                );

                let replies = JSON.parse(existingReplies[0]?.replies || '[]');
                replies.push(newReply);

                await pool.query(
                    `UPDATE comments SET replies = ? WHERE id = ?`,
                    [JSON.stringify(replies), parentCommentId]
                );

                io.emit('updateReplies', { parentCommentId, replies });
            } catch (error) {
                console.error('Error replying to comment:', error);
                socket.emit('error', 'Failed to reply to comment');
            }
        });
        socket.on('editReply', async ({ postId, commentId, replyId, newText, userId }) => {
            try {
                const [comment] = await pool.query('SELECT replies FROM comments WHERE id = ?', [commentId]);
                let replies = JSON.parse(comment[0]?.replies || '[]');

                const replyIndex = replies.findIndex(reply => reply.replyId === replyId && reply.userId === userId);

                if (replyIndex === -1) {
                    console.error('Reply not found or unauthorized');
                    socket.emit('error', 'Reply not found or unauthorized');
                    return;
                }
                replies[replyIndex].comment = newText;
                await pool.query('UPDATE comments SET replies = ? WHERE id = ?', [JSON.stringify(replies), commentId]);

                io.emit('updateReplies', { postId, commentId, replies });
            } catch (error) {
                console.error('Error editing reply:', error);
                socket.emit('error', 'Failed to edit reply');
            }
        });

        socket.on('deleteReply', async ({ postId, commentId, replyId, userId }) => {
            try {

                const [comment] = await pool.query('SELECT replies FROM comments WHERE id = ?', [commentId]);

                let replies = JSON.parse(comment[0]?.replies || '[]');

                const replyIndex = replies.findIndex(
                    reply => reply.replyId === Number(replyId) && reply.userId === String(userId)
                );

                if (replyIndex === -1) {
                    console.error(`Reply not found or unauthorized. replyId: ${replyId}, userId: ${userId}`);
                    socket.emit('error', 'Reply not found or unauthorized');
                    return;
                }

                replies.splice(replyIndex, 1);
                await pool.query('UPDATE comments SET replies = ? WHERE id = ?', [JSON.stringify(replies), commentId]);

                io.emit('updateReplies', { postId, commentId, replies });
            } catch (error) {
                console.error('Error deleting reply:', error);
                socket.emit('error', 'Failed to delete reply');
            }
        });



        async function getCommentsForPost(postId) {
            const [comments] = await pool.query(`
        SELECT c.id, c.user_id, c.comment, c.replies, u.name AS username 
        FROM comments c 
        JOIN users u ON c.user_id = u.userid 
        WHERE c.post_id = ?`,
                [postId]
            );

            return comments.map(row => ({
                commentId: row.id,
                userId: row.user_id,
                comment: row.comment,
                username: row.username,
                replies: JSON.parse(row.replies || '[]'),
            }));
        }

        socket.on('disconnect', () => {
            console.log('socket disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
