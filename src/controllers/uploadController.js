import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: false
        }
    }
);

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// @desc    Get upload page with user's files
// @route   GET /upload
export const getUploadPage = asyncHandler(async (req, res) => {
    const [files, folders] = await Promise.all([
        prisma.file.findMany({
            where: { 
                userId: req.user.id,
                folderId: null
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.folder.findMany({
            where: { 
                userId: req.user.id,
                parentId: null
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    res.render('upload/index', {
        title: 'Upload Files',
        files,
        folders
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

    const { folderId } = req.body;

    // If folderId is provided, verify it exists and belongs to the user
    if (folderId) {
        const folder = await prisma.folder.findUnique({
            where: { id: folderId }
        });

        if (!folder || folder.userId !== req.user.id) {
            return res.render('upload/index', {
                title: 'Upload Files',
                error: 'Invalid folder'
            });
        }
    }

    try {
        // Generate a unique file path in Supabase storage
        // Format: userId/folderId/timestamp-filename
        const timestamp = Date.now();
        const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = folderId 
            ? `${req.user.id}/${folderId}/${timestamp}-${safeFilename}`
            : `${req.user.id}/root/${timestamp}-${safeFilename}`;

        console.log('Uploading file to Supabase:', filePath);

        // Upload file to Supabase storage
        const { data, error } = await supabase.storage
            .from('files')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }

        console.log('File uploaded successfully to Supabase');

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(filePath);

        console.log('Public URL:', publicUrl);

        // Create file record in database
        const file = await prisma.file.create({
            data: {
                filename: req.file.originalname,
                path: filePath,
                publicUrl,
                mimetype: req.file.mimetype,
                size: req.file.size,
                userId: req.user.id,
                folderId: folderId || null
            }
        });

        console.log('File record created in database:', file.id);

        // If file is uploaded to a folder, redirect to that folder
        if (folderId) {
            res.redirect(`/folders/${folderId}`);
        } else {
            res.redirect('/upload');
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.render('upload/index', {
            title: 'Upload Files',
            error: 'Error uploading file. Please try again.'
        });
    }
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

    // Redirect to the public URL
    res.redirect(file.publicUrl);
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

    try {
        console.log('Deleting file from Supabase:', file.path);
        
        // Delete file from Supabase storage
        const { error } = await supabase.storage
            .from('files')
            .remove([file.path]);

        if (error) {
            console.error('Supabase delete error:', error);
            throw error;
        }

        console.log('File deleted successfully from Supabase');

        // Delete file record from database
        await prisma.file.delete({
            where: { id: req.params.id }
        });

        console.log('File record deleted from database');

        // If file was in a folder, redirect to that folder
        if (file.folderId) {
            res.redirect(`/folders/${file.folderId}`);
        } else {
            res.redirect('/upload');
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error deleting file. Please try again.'
        });
    }
}); 