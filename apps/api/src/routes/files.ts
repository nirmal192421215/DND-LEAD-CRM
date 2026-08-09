import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const filesRouter = Router();
filesRouter.use(authenticate);

// Configure multer
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB ?? '20');
const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|dwg|xlsx?|xls|png|jpg|jpeg|gif|webp/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

function getKind(ext: string): 'pdf' | 'dwg' | 'img' | 'xls' {
  const e = ext.toLowerCase().replace('.', '');
  if (e === 'pdf') return 'pdf';
  if (e === 'dwg') return 'dwg';
  if (['xls', 'xlsx'].includes(e)) return 'xls';
  return 'img';
}

// POST /api/files/upload
filesRouter.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ success: false, error: 'No file provided' }); return; }
  const { leadId } = req.body;
  if (!leadId) { res.status(400).json({ success: false, error: 'leadId is required' }); return; }

  const ext = path.extname(req.file.originalname);
  const fileAsset = await prisma.fileAsset.create({
    data: {
      leadId,
      fileName: req.file.originalname,
      kind: getKind(ext),
      sizeBytes: req.file.size,
      storagePath: req.file.path,
      uploadedById: req.user!.userId,
    },
    include: { uploadedBy: { select: { id: true, name: true, initials: true } } },
  });

  res.status(201).json({ success: true, data: fileAsset });
});

// GET /api/files?leadId=xxx
filesRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { leadId } = req.query as { leadId?: string };
  const files = await prisma.fileAsset.findMany({
    where: leadId ? { leadId } : undefined,
    include: { uploadedBy: { select: { id: true, name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: files });
});

// DELETE /api/files/:id
filesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const file = await prisma.fileAsset.findUnique({ where: { id: req.params['id'] } });
  if (!file) { res.status(404).json({ success: false, error: 'File not found' }); return; }

  if (fs.existsSync(file.storagePath)) fs.unlinkSync(file.storagePath);
  await prisma.fileAsset.delete({ where: { id: req.params['id'] } });
  res.json({ success: true, message: 'File deleted' });
});
