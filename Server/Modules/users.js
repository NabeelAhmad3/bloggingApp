const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const secretKey = 'helloWorld';

router.post('/register', async (request, response) => {
    const { name, email, phone, password } = request.body;

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = 'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)';
        const result = await pool.query(sql, [name, email, phone, hashedPassword]);

        const token = jwt.sign({ id: result[0].insertId }, secretKey, { expiresIn: '12h' });

        const [newUser] = await pool.query('SELECT name FROM users WHERE userid = ?', [result[0].insertId]);

        response.status(201).json({ message: 'User created successfully', token: token, userid: result[0].insertId, userName: newUser[0].name });
    } catch (error) {
        console.error('Error during user registration:', error);
        response.status(500).json({ message: 'Error adding user', error: error.message });
    }
});

router.post('/login', async (request, response) => {
    const { email, password } = request.body;

    const sql = 'SELECT * FROM users WHERE email = ?';

    try {
        const [result] = await pool.query(sql, [email]);

        if (result.length === 0) {
            return response.status(404).json({ message: 'User does not exist' });
        }

        const user = result[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return response.status(401).json({ message: 'Invalid password' });
        }

        const nameSql = 'SELECT name FROM users WHERE userid = ?';
        const [nameResult] = await pool.query(nameSql, [user.userid]);
        const userName = nameResult[0].name;

        const token = jwt.sign({ id: user.userid }, secretKey, { expiresIn: '12h' });
        response.status(200).json({ message: 'Login successful', token, userid: user.userid, userName: userName });

    } catch (error) {
        console.error('Error during login:', error);
        return response.status(500).json({ message: 'Database error', error });
    }
});

router.get('/userDetails', async (request, response) => {
    const userId = request.query.userId;
    try {
        const [results] = await pool.query(`
        SELECT name ,email FROM users WHERE userid = ?`, [userId]);

        response.json(results);
    } catch (error) {
        console.error('Error fetching user name:', error);
        response.status(500).json({ message: 'Error fetching user name', error });
    }
});

module.exports = router;
