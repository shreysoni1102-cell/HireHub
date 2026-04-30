import { Router } from 'express';
import multer from 'multer';
import { analyzeResumeATS, enhanceResumeText } from '../utils/aiService.js';
import { protect } from '../middleware/auth.js';
import { extractText } from 'unpdf';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

/**
 * Multi-strategy PDF text extractor — handles most real-world PDFs
 */
async function extractTextFromPDFBuffer(buffer) {
  // Try modern PDF text extraction using unpdf first
  try {
    console.log(`[PDF] Attempting modern PDF extraction using unpdf...`);
    const { text, totalPages } = await extractText(new Uint8Array(buffer));
    if (text && Array.isArray(text) && text.length > 0) {
      const fullText = text.join('\n').trim();
      if (fullText.length > 30) {
        console.log(`[PDF] Successfully extracted ${fullText.length} characters from ${totalPages} pages using unpdf.`);
        return fullText;
      }
    }
  } catch (err) {
    console.error(`[PDF] unpdf extraction failed, falling back to regex parser:`, err);
  }

  const raw = buffer.toString('latin1');
  const chunks = [];

  // ── Strategy 1: BT...ET blocks with Tj / TJ operators ───────────────────
  const btEtBlocks = raw.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btEtBlocks) {
    // (text) Tj
    const tjMatches = block.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g);
    for (const m of tjMatches) chunks.push(m[1]);

    // [(text) kerning ...] TJ
    const tjArrMatches = block.matchAll(/\[([^\]]*)\]\s*TJ/g);
    for (const m of tjArrMatches) {
      const strings = m[1].matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g);
      for (const s of strings) chunks.push(s[1]);
    }
  }

  // ── Strategy 2: Decompress stream — look for readable text directly ──────
  if (chunks.length < 10) {
    // Try to grab plain text between stream markers
    const streamMatches = raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g);
    for (const m of streamMatches) {
      const content = m[1];
      // Extract readable ASCII words of 3+ chars
      const words = content.match(/[A-Za-z][A-Za-z0-9''\-]{2,}/g) || [];
      chunks.push(...words);
    }
  }

  // ── Strategy 3: Global fallback — extract all readable parenthesised text ─
  if (chunks.length < 10) {
    const fallback = raw.matchAll(/\(([A-Za-z0-9 ,.\-@#&*!?'"/:;\r\n]{3,})\)/g);
    for (const m of fallback) chunks.push(m[1]);
  }

  // ── Strategy 4: Last resort — grab all long readable words from whole file ─
  if (chunks.length < 5) {
    const words = raw.match(/[A-Za-z][A-Za-z0-9''\-]{3,}/g) || [];
    chunks.push(...words.slice(0, 500)); // cap to avoid noise
  }

  const text = chunks
    .map((c) =>
      c
        .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
        .trim()
    )
    .filter((s) => s.length > 1)
    .join(' ');

  console.log(`[PDF] Extracted ${text.length} characters from ${buffer.length} byte PDF`);
  return text;
}

/**
 * @swagger
 * /api/ai/ats-check:
 *   post:
 *     summary: AI Resume ATS Score Checker
 *     tags: [AI Tools]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [resume, jobDescription]
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *               jobDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Detailed ATS analysis.
 *       400:
 *         description: Bad request.
 *       500:
 *         description: AI error.
 */
router.post('/ats-check', protect, upload.single('resume'), async (req, res, next) => {
  try {
    const { jobDescription } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a resume PDF file.' });
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({ message: 'Please provide a job description (min 50 chars).' });
    }

    const resumeText = await extractTextFromPDFBuffer(req.file.buffer);
    console.log(`[PDF] Preview: "${resumeText.slice(0, 200)}..."`);

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        message: 'Could not extract text from the PDF. Use a text-based PDF (not a scanned image).',
      });
    }

    const analysis = await analyzeResumeATS(resumeText, jobDescription);
    res.json({ success: true, extractedChars: resumeText.length, resumeText, data: analysis });
  } catch (err) {
    next(err);
  }
});

// ── Text-based route (no PDF upload needed) ──────────────────────────────────
router.post('/ats-check-text', protect, async (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || resumeText.trim().length < 100) {
      return res.status(400).json({ message: 'Please provide resume text (minimum 100 characters).' });
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({ message: 'Please provide a job description (minimum 50 characters).' });
    }

    console.log(`[TEXT] Resume text: ${resumeText.length} chars`);
    const analysis = await analyzeResumeATS(resumeText.trim(), jobDescription.trim());
    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/ai/enhance-resume:
 *   post:
 *     summary: AI Resume Summary & Bullet Point Enhancer
 *     tags: [AI Tools]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resumeText, jobDescription]
 *             properties:
 *               resumeText:
 *                 type: string
 *               jobDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Optimized professional summary and bullet points.
 */
router.post('/enhance-resume', protect, async (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ message: 'Please provide resume text to enhance.' });
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({ message: 'Please provide a detailed job description.' });
    }

    console.log(`[AI Enhance] Optimizing resume text against job description...`);
    const enhancedData = await enhanceResumeText(resumeText.trim(), jobDescription.trim());

    res.json({ success: true, data: enhancedData });
  } catch (err) {
    next(err);
  }
});

export default router;
