const { body, query } = require('express-validator');
const { PROJECT_STATUSES } = require('../models/Project');
const projectService = require('../services/projectService');

const projectFieldsValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 120 }).withMessage('El nombre no puede exceder 120 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage('Estado inválido'),
  body('thumbnail').optional().trim().isLength({ max: 524288 }).withMessage('La miniatura es demasiado extensa').custom((value) => {
    if (value && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) throw new Error('La miniatura debe ser una imagen válida');
    return true;
  }),
];

const MAX_EDITOR_STATE_BYTES = 12 * 1024 * 1024;

const updateProjectValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío').isLength({ max: 120 }).withMessage('El nombre no puede exceder 120 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage('Estado inválido'),
  body('thumbnail').optional().trim().isLength({ max: 524288 }).withMessage('La miniatura es demasiado extensa').custom((value) => {
    if (value && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) throw new Error('La miniatura debe ser una imagen válida');
    return true;
  }),
  body('editorState').optional().isObject().withMessage('editorState debe ser un objeto').custom((value) => {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_EDITOR_STATE_BYTES) {
      throw new Error('El documento supera el límite seguro de 12 MB');
    }
    return true;
  }),
  body('expectedDocumentVersion').optional().isInt({ min: 0 }).withMessage('expectedDocumentVersion debe ser un entero no negativo'),
  body().custom((value) => {
    if (!['name', 'description', 'status', 'thumbnail', 'editorState'].some((field) => value[field] !== undefined)) throw new Error('No hay campos para actualizar');
    if (value.expectedDocumentVersion !== undefined && value.editorState === undefined) throw new Error('expectedDocumentVersion sólo se admite al guardar el editor');
    return true;
  }),
];

const listProjectsValidation = [
  query('search').optional().trim().isLength({ max: 120 }).withMessage('La búsqueda es demasiado extensa'),
  query('status').optional().isIn(PROJECT_STATUSES).withMessage('Estado inválido'),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt']).withMessage('Criterio de orden inválido'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Dirección de orden inválida'),
];

const editableFields = (bodyValue) => ['name', 'description', 'status', 'thumbnail', 'editorState', 'expectedDocumentVersion'].reduce((result, field) => {
  if (bodyValue[field] !== undefined) result[field] = bodyValue[field];
  return result;
}, {});

const listProjects = async (req, res, next) => {
  try { res.json(await projectService.list(req.user._id, req.query)); } catch (error) { next(error); }
};

const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getById(req.user._id, req.params.id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    return res.json({ project });
  } catch (error) { return next(error); }
};

const createProject = async (req, res, next) => {
  try {
    const project = await projectService.create(req.user._id, editableFields(req.body));
    res.status(201).json({ message: 'Proyecto creado', project });
  } catch (error) { next(error); }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.update(req.user._id, req.params.id, editableFields(req.body));
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    return res.json({ message: 'Proyecto actualizado', project });
  } catch (error) {
    if (error.code === 'DOCUMENT_VERSION_CONFLICT') {
      return res.status(409).json({ message: error.message, code: error.code });
    }
    return next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const project = await projectService.remove(req.user._id, req.params.id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    return res.json({ message: 'Proyecto eliminado' });
  } catch (error) { return next(error); }
};

const duplicateProject = async (req, res, next) => {
  try {
    const project = await projectService.duplicate(req.user._id, req.params.id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    return res.status(201).json({ message: 'Proyecto duplicado', project });
  } catch (error) { return next(error); }
};

module.exports = {
  listProjects, getProject, createProject, updateProject, deleteProject, duplicateProject,
  projectFieldsValidation, updateProjectValidation, listProjectsValidation,
};
