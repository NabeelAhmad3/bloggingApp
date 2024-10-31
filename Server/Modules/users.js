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
        const token = jwt.sign({ id: result.insertId }, secretKey, { expiresIn: '1d' });

        response.status(201).json({ message: 'User created successfully',token: token, userid: result[0].insertId });
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

        const token = jwt.sign({ id: user.userid }, secretKey, { expiresIn: '1h' });
        response.status(200).json({ message: 'Login successfull', token, userid: user.userid });

    } catch (error) {
        console.error('Error during login:', error);
        return response.status(500).json({ message: 'Database error', error });
    }
});

module.exports = router;
