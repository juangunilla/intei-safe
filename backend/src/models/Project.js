const mongoose = require('mongoose');

const PROJECT_STATUSES = ['Borrador', 'En proceso', 'Finalizado'];

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [120, 'El nombre no puede exceder 120 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'La descripción no puede exceder 1000 caracteres'],
      default: '',
    },
    status: {
      type: String,
      enum: { values: PROJECT_STATUSES, message: 'Estado inválido' },
      default: 'Borrador',
    },
    thumbnail: {
      type: String,
      trim: true,
      maxlength: [524288, 'La miniatura es demasiado extensa'],
      default: '',
    },
    editorState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    documentVersion: {
      type: Number,
      min: 0,
      default: 0,
    },
    editorSavedAt: {
      type: Date,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ owner: 1, status: 1, createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
