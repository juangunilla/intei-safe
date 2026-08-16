const Project = require('../models/Project');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyExpectedDocumentVersion = (filter, expectedDocumentVersion) => {
  if (expectedDocumentVersion === undefined) return filter;
  if (expectedDocumentVersion === 0) {
    return {
      ...filter,
      $or: [
        { documentVersion: 0 },
        { documentVersion: { $exists: false } },
        { documentVersion: null },
      ],
    };
  }
  return { ...filter, documentVersion: expectedDocumentVersion };
};

class ProjectService {
  async list(ownerId, { search, status, sortBy = 'updatedAt', order = 'desc' }) {
    const filter = { owner: ownerId };
    if (status) filter.status = status;
    if (search) {
      const expression = new RegExp(escapeRegExp(search.trim()), 'i');
      filter.$or = [{ name: expression }, { description: expression }];
    }

    const allowedSortFields = new Set(['createdAt', 'updatedAt']);
    const field = allowedSortFields.has(sortBy) ? sortBy : 'updatedAt';
    const direction = order === 'asc' ? 1 : -1;
    const projects = await Project.find(filter)
      .populate('owner', 'name email')
      .sort({ [field]: direction, _id: direction });
    return { projects, total: projects.length };
  }

  async getById(ownerId, projectId) {
    return Project.findOne({ _id: projectId, owner: ownerId }).populate('owner', 'name email');
  }

  async create(ownerId, data) {
    const project = await Project.create({ ...data, owner: ownerId });
    return project.populate('owner', 'name email');
  }

  async update(ownerId, projectId, data) {
    if (data.editorState !== undefined) {
      const { expectedDocumentVersion, ...fields } = data;
      const filter = applyExpectedDocumentVersion({ _id: projectId, owner: ownerId }, expectedDocumentVersion);
      const project = await Project.findOneAndUpdate(
        filter,
        {
          $set: { ...fields, editorSavedAt: new Date() },
          $inc: { documentVersion: 1 },
        },
        { new: true, runValidators: true }
      ).populate('owner', 'name email');
      if (!project && expectedDocumentVersion !== undefined) {
        const exists = await Project.exists({ _id: projectId, owner: ownerId });
        if (exists) {
          const error = new Error('El proyecto fue modificado desde otra sesión');
          error.code = 'DOCUMENT_VERSION_CONFLICT';
          throw error;
        }
      }
      return project;
    }
    return Project.findOneAndUpdate(
      { _id: projectId, owner: ownerId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('owner', 'name email');
  }

  async remove(ownerId, projectId) {
    return Project.findOneAndDelete({ _id: projectId, owner: ownerId });
  }

  async duplicate(ownerId, projectId) {
    const source = await Project.findOne({ _id: projectId, owner: ownerId });
    if (!source) return null;
    return this.create(ownerId, {
      name: `${source.name} (copia)`,
      description: source.description,
      status: 'Borrador',
      thumbnail: source.thumbnail,
      editorState: source.editorState,
      documentVersion: 0,
    });
  }
}

module.exports = new ProjectService();
module.exports.applyExpectedDocumentVersion = applyExpectedDocumentVersion;
