import express from 'express';
import { createFolder, getFolderContents, deleteFolder } from '../controllers/folderController.js';

const router = express.Router();

// Routes
router.post('/', createFolder);
router.get('/:id', getFolderContents);
router.delete('/:id', deleteFolder);

export default router; 