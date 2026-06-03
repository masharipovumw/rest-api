const Material = require('../models/Material');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const LessonPlan = require('../models/LessonPlan');
const fs = require('fs');
const path = require('path');
const { success, error } = require('../utils/response');
const { convertPptxToPdf } = require('../services/pptxConverter');

/**
 * POST /api/materials/upload
 * Upload a new material (teacher/admin only)
 */
const uploadMaterial = async (req, res) => {
  try {
    const { title, description, type, topic, textContent } = req.body;

    if (!title || !type || !topic) {
      return error(res, 'Title, type, and topic are required.', 400);
    }

    const materialData = {
      title,
      description: description || '',
      type,
      topic,
      textContent: textContent || null,
      teacherId: req.user._id,
    };

    // If a file was uploaded, add file metadata
    if (req.file) {
      const folder = getMimeFolder(req.file.mimetype);
      materialData.fileUrl = `/uploads/${folder}/${req.file.filename}`;
      materialData.fileName = req.file.originalname;
      materialData.mimeType = req.file.mimetype;
      materialData.size = req.file.size;
    } else if (type !== 'text') {
      return error(res, 'File is required for non-text materials.', 400);
    }

    const material = await Material.create(materialData);

    // Kick off PPTX → PDF conversion in the background (non-blocking)
    if ((type === 'pptx' || type === 'ppt' || type === 'presentation') && req.file) {
      const pptxAbsPath = path.join(process.cwd(), materialData.fileUrl);
      const pdfFileName = path.basename(req.file.filename, path.extname(req.file.filename)) + '.pdf';
      const pdfRelUrl = `/uploads/pdfs/${pdfFileName}`;
      const pdfAbsPath = path.join(process.cwd(), pdfRelUrl);

      convertPptxToPdf(pptxAbsPath, pdfAbsPath)
        .then(async () => {
          await Material.findByIdAndUpdate(material._id, { convertedPdfUrl: pdfRelUrl });
          console.log(`[upload] PDF saved for material ${material._id}`);
        })
        .catch((convErr) => {
          console.error(`[upload] PPTX conversion failed for material ${material._id}:`, convErr.message);
        });
    }

    return success(res, material, 'Material uploaded successfully', 201);
  } catch (err) {
    console.error('Upload material error:', err);
    return error(res, 'Failed to upload material.');
  }
};

/**
 * GET /api/materials
 * List all materials (with optional filters)
 */
const getMaterials = async (req, res) => {
  try {
    const { type, topic, approved, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (topic) filter.topic = { $regex: topic, $options: 'i' };
    if (approved !== undefined) filter.approved = approved === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const materials = await Material.find(filter)
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Material.countDocuments(filter);

    return success(res, {
      materials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get materials error:', err);
    return error(res, 'Failed to get materials.');
  }
};

/**
 * GET /api/materials/:id
 * Get single material by ID
 */
const getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('teacherId', 'name email');

    if (!material) {
      return error(res, 'Material not found.', 404);
    }

    return success(res, material);
  } catch (err) {
    console.error('Get material error:', err);
    return error(res, 'Failed to get material.');
  }
};

/**
 * PUT /api/materials/:id
 * Update material metadata (teacher/admin only)
 */
const updateMaterial = async (req, res) => {
  try {
    const { title, description, topic, textContent } = req.body;

    const material = await Material.findById(req.params.id);
    if (!material) {
      return error(res, 'Material not found.', 404);
    }

    // Only the teacher who created it or admin can update
    if (material.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return error(res, 'Not authorized to update this material.', 403);
    }

    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (topic) material.topic = topic;
    if (textContent !== undefined) material.textContent = textContent;

    await material.save();

    return success(res, material, 'Material updated successfully');
  } catch (err) {
    console.error('Update material error:', err);
    return error(res, 'Failed to update material.');
  }
};

/**
 * DELETE /api/materials/:id
 * Delete material and its file (teacher/admin only)
 */
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return error(res, 'Material not found.', 404);
    }

    // Only the teacher who created it or admin can delete
    if (material.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return error(res, 'Not authorized to delete this material.', 403);
    }

    // Delete file from disk if it exists
    if (material.fileUrl) {
      const filePath = path.join(process.cwd(), material.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (material.convertedPdfUrl) {
      const pdfPath = path.join(process.cwd(), material.convertedPdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // Delete related data in MongoDB to free up space (Cascade Delete)
    const tests = await Test.find({ materialId: req.params.id });
    const testIds = tests.map(t => t._id);
    
    // 1. Delete all submissions for those tests
    if (testIds.length > 0) {
      await Submission.deleteMany({ testId: { $in: testIds } });
    }
    
    // 2. Delete the tests themselves
    await Test.deleteMany({ materialId: req.params.id });
    
    // 3. Delete any lesson plans associated with this material
    await LessonPlan.deleteMany({ materialId: req.params.id });

    // 4. Finally, delete the material document
    await Material.findByIdAndDelete(req.params.id);

    return success(res, null, 'Material deleted successfully');
  } catch (err) {
    console.error('Delete material error:', err);
    return error(res, 'Failed to delete material.');
  }
};

/**
 * POST /api/materials/:id/approve
 * Approve a material (teacher/admin only)
 */
const approveMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return error(res, 'Material not found.', 404);
    }

    material.approved = true;
    await material.save();

    return success(res, material, 'Material approved successfully');
  } catch (err) {
    console.error('Approve material error:', err);
    return error(res, 'Failed to approve material.');
  }
};

// Helper: get folder name from mime type
function getMimeFolder(mimetype) {
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audios';
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype === 'application/pdf') return 'pdfs';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'presentations';
  return 'pdfs';
}

module.exports = {
  uploadMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  approveMaterial,
};
