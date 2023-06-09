require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User, Todo } = require('./db/models');

const SALT = Number(process.env.PASSWORD_SALT);
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

app.use(express.json());

app.post('/register', async function(req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({
        where: {
            email,
        }
    });

    if (user) {
        res.status(400);
        res.json({
            error: 'user already exist',
        });

        return;
    }

    const encryptedPassword = bcrypt.hashSync(password, SALT);

    await User.create({
        name,
        email,
        password: encryptedPassword,
    });

    res.json(true);
});

app.post('/login', async function(req, res) {
    const audience = req.header('x-audience');

    if (!audience) {
        res.status(400);
        res.json({
            error: 'audience unknown',
        });

        return;
    }

    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({
        where: {
            email,
        }
    });

    if (!user) {
        res.status(400);
        res.json({
            error: 'user not found',
        });

        return;
    }

    if (!bcrypt.compareSync(password, user.password)) {
        res.status(400);
        res.json({
            error: 'wrong password',
        });

        return;
    }

    const token = jwt.sign({
        sub: user.id,
        iss: 'skilvul',
        aud: audience,
        exp: parseInt(((new Date()).getTime() / 1000) + 5 * 60 * 60),
    }, JWT_SECRET);

    res.json({
        token,
    });
});

app.post('/todos', async function(req, res) {
    const token = req.header('authorization');

    let user = null;

    try {
        const decode = jwt.verify(token, JWT_SECRET);
        user = await User.findOne({
            where: {
                id: decode.sub,
            },
        });

        if (!user) {
            res.status(403);
            res.json({
                error: 'invalid token',
            });

            return;
        }
    } catch (error) {
        res.status(403);
        res.json({
            error: 'token invalid',
        });

        return;
    }

    const task = req.body.task;

    await Todo.create({
        user_id: user.id,
        task,
        do_at: new Date(),
    });

    res.json(true);
});

app.get('/todos', async function(req, res) {});
app.get('/todos/:id', async function(req, res) {});
app.put('/todos/:id', async function(req, res) {});
app.delete('/todos/:id', async function(req, res) {});
app.delete('/todos', async function(req, res) {});

app.listen(PORT);
