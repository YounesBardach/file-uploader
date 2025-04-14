import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

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

// @desc    Create a new folder
// @route   POST /folders
export const createFolder = asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;

    try {
        // Create folder in database
        const folder = await prisma.folder.create({
            data: {
                name,
                userId: req.user.id,
                parentId: parentId || null
            }
        });

        console.log('Folder created in database:', folder.id);

        // No need to create physical folder in Supabase Storage
        // as it uses paths to simulate folders

        res.redirect(`/folders/${folder.id}`);
    } catch (error) {
        console.error('Folder creation error:', error);
        res.render('upload/index', {
            title: 'Upload Files',
            error: 'Error creating folder. Please try again.'
        });
    }
});

// @desc    Get folder contents
// @route   GET /folders/:id
export const getFolderContents = asyncHandler(async (req, res) => {
    const folder = await prisma.folder.findUnique({
        where: { id: req.params.id },
        include: {
            files: true,
            children: true
        }
    });

    if (!folder) {
        return res.status(404).render('error', {
            title: 'Error',
            message: 'Folder not found'
        });
    }

    if (folder.userId !== req.user.id) {
        return res.status(403).render('error', {
            title: 'Error',
            message: 'Not authorized to access this folder'
        });
    }

    res.render('upload/index', {
        title: folder.name,
        currentFolder: folder,
        files: folder.files,
        folders: folder.children
    });
});

// @desc    Delete a folder
// @route   DELETE /folders/:id
export const deleteFolder = asyncHandler(async (req, res) => {
    const folder = await prisma.folder.findUnique({
        where: { id: req.params.id },
        include: {
            files: true,
            children: {
                include: {
                    files: true
                }
            }
        }
    });

    if (!folder) {
        return res.status(404).render('error', {
            title: 'Error',
            message: 'Folder not found'
        });
    }

    if (folder.userId !== req.user.id) {
        return res.status(403).render('error', {
            title: 'Error',
            message: 'Not authorized to delete this folder'
        });
    }

    try {
        // Delete all files in the folder from Supabase storage
        for (const file of folder.files) {
            console.log('Deleting file from Supabase:', file.path);
            const { error } = await supabase.storage
                .from('files')
                .remove([file.path]);
            if (error) {
                console.error('Supabase delete error:', error);
                throw error;
            }
        }

        // Delete files in subfolders from Supabase storage
        for (const subfolder of folder.children) {
            for (const file of subfolder.files) {
                console.log('Deleting file from Supabase:', file.path);
                const { error } = await supabase.storage
                    .from('files')
                    .remove([file.path]);
                if (error) {
                    console.error('Supabase delete error:', error);
                    throw error;
                }
            }
        }

        // Delete folder and its contents from database
        await prisma.folder.delete({
            where: { id: req.params.id }
        });

        console.log('Folder and its contents deleted from database');

        // If the folder was inside another folder, redirect to that folder
        if (folder.parentId) {
            res.redirect(`/folders/${folder.parentId}`);
        } else {
            res.redirect('/upload');
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error deleting folder. Please try again.'
        });
    }
}); 