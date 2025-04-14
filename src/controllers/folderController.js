import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new folder
// @route   POST /folders
export const createFolder = asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;

    const folder = await prisma.folder.create({
        data: {
            name,
            userId: req.user.id,
            parentId: parentId || null
        }
    });

    // Create physical folder
    const folderPath = path.join(__dirname, '../../public/uploads', folder.id);
    await fs.mkdir(folderPath, { recursive: true });

    // Redirect to the newly created folder
    res.redirect(`/folders/${folder.id}`);
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

    // Delete all files in the folder
    for (const file of folder.files) {
        // Delete physical file
        await fs.unlink(file.path);
        // Delete file record
        await prisma.file.delete({
            where: { id: file.id }
        });
    }

    // Recursively delete all subfolders and their contents
    for (const subfolder of folder.children) {
        // Delete files in subfolder
        for (const file of subfolder.files) {
            await fs.unlink(file.path);
            await prisma.file.delete({
                where: { id: file.id }
            });
        }
        // Delete subfolder record
        await prisma.folder.delete({
            where: { id: subfolder.id }
        });
    }

    // Delete physical folder and its contents
    const folderPath = path.join(__dirname, '../../public/uploads', folder.id);
    await fs.rm(folderPath, { recursive: true, force: true });

    // Delete the folder itself from database
    await prisma.folder.delete({
        where: { id: req.params.id }
    });

    // If the folder was inside another folder, redirect to that folder
    if (folder.parentId) {
        res.redirect(`/folders/${folder.parentId}`);
    } else {
        res.redirect('/upload');
    }
}); 