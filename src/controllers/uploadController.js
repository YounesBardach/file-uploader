import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get upload page with user's files
// @route   GET /upload
export const getUploadPage = asyncHandler(async (req, res) => {
    const files = await prisma.file.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });

    res.render('upload/index', {
        title: 'Upload Files',
        files
    });
});

// @desc    Upload a file
// @route   POST /upload
export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.render('upload/index', {
            title: 'Upload Files',
            error: 'Please select a file to upload'
        });
    }

    const file = await prisma.file.create({
        data: {
            filename: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            userId: req.user.id
        }
    });

    res.render('upload/index', {
        title: 'Upload Files',
        success: 'File uploaded successfully',
        files: await prisma.file.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        })
    });
});

// @desc    Download a file
// @route   GET /upload/:id
export const downloadFile = asyncHandler(async (req, res) => {
    const file = await prisma.file.findUnique({
        where: { id: req.params.id }
    });

    if (!file) {
        return res.status(404).render('error', {
            title: 'Error',
            message: 'File not found'
        });
    }

    // Check if user owns the file
    if (file.userId !== req.user.id) {
        return res.status(403).render('error', {
            title: 'Error',
            message: 'Not authorized to access this file'
        });
    }

    res.download(file.path, file.filename);
});

// @desc    Delete a file
// @route   DELETE /upload/:id
export const deleteFile = asyncHandler(async (req, res) => {
    const file = await prisma.file.findUnique({
        where: { id: req.params.id }
    });

    if (!file) {
        return res.status(404).render('error', {
            title: 'Error',
            message: 'File not found'
        });
    }

    // Check if user owns the file
    if (file.userId !== req.user.id) {
        return res.status(403).render('error', {
            title: 'Error',
            message: 'Not authorized to delete this file'
        });
    }

    // Delete file from filesystem
    await fs.unlink(file.path);

    // Delete file record from database
    await prisma.file.delete({
        where: { id: req.params.id }
    });

    res.redirect('/upload');
}); 