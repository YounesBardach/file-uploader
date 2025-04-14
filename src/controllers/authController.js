import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import asyncHandler from 'express-async-handler';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// @desc    Register a new user
// @route   POST /auth/register
export const register = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('auth/register', {
            title: 'Register',
            error: errors.array()[0].msg
        });
    }

    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('auth/register', {
            title: 'Register',
            error: 'Passwords do not match'
        });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
        where: { email }
    });

    if (userExists) {
        return res.render('auth/register', {
            title: 'Register',
            error: 'User already exists'
        });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword
        }
    });

    if (user) {
        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/auth/login');
    } else {
        res.render('auth/register', {
            title: 'Register',
            error: 'Invalid user data'
        });
    }
});

// @desc    Login user
// @route   POST /auth/login
export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        return res.render('auth/login', {
            title: 'Login',
            error: 'Invalid credentials'
        });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.render('auth/login', {
            title: 'Login',
            error: 'Invalid credentials'
        });
    }

    req.login(user, (err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/upload');
    });
});

// @desc    Logout user
// @route   GET /auth/logout
export const logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
}; 