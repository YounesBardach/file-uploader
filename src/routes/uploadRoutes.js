import express from 'express';
import { getUploadPage, uploadFile, downloadFile, deleteFile, upload } from '../controllers/uploadController.js';

const router = express.Router();

// Routes
router.get('/', getUploadPage);
router.post('/', upload.single('file'), uploadFile);
router.get('/:id', downloadFile);
router.delete('/:id', deleteFile);

export default router; 