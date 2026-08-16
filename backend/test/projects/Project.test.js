const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Project = require('../../src/models/Project');

const owner = new mongoose.Types.ObjectId();

test('crea un proyecto independiente con valores iniciales seguros', () => {
  const project = new Project({ name: 'Planta baja', owner });

  assert.equal(project.name, 'Planta baja');
  assert.equal(project.status, 'Borrador');
  assert.equal(project.description, '');
  assert.equal(project.thumbnail, '');
  assert.equal(project.editorState, null);
  assert.equal(project.documentVersion, 0);
  assert.equal(project.owner.toString(), owner.toString());
});

test('rechaza estados que no pertenecen al módulo Mis Proyectos', async () => {
  const project = new Project({ name: 'Planta baja', owner, status: 'Archivado' });

  await assert.rejects(project.validate(), /Estado inválido/);
});

test('requiere nombre y usuario propietario', async () => {
  const project = new Project({ description: 'Sin identidad' });

  await assert.rejects(project.validate(), /El nombre es requerido/);
  const error = project.validateSync();
  assert.ok(error.errors.owner);
});
