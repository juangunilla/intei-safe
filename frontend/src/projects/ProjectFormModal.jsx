import { useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { PROJECT_STATUSES } from './projectConstants';

const emptyProject = { name: '', description: '', status: 'Borrador' };

const ProjectFormModal = ({ show, project, onHide, onSubmit }) => {
  const [form, setForm] = useState(emptyProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setForm(project ? { name: project.name, description: project.description, status: project.status } : emptyProject);
      setError('');
    }
  }, [show, project]);

  const change = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Ingresá un nombre para el proyecto.');
    setSaving(true);
    setError('');
    try { await onSubmit(form); onHide(); } catch (requestError) {
      setError(requestError.response?.data?.errors?.[0]?.msg || requestError.response?.data?.message || 'No se pudo guardar el proyecto.');
    } finally { setSaving(false); }
  };

  return <Modal show={show} onHide={saving ? undefined : onHide} centered>
    <Form onSubmit={submit}>
      <Modal.Header closeButton><Modal.Title>{project ? 'Editar proyecto' : 'Crear proyecto'}</Modal.Title></Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <Form.Group className="mb-3" controlId="projectName"><Form.Label>Nombre</Form.Label><Form.Control name="name" value={form.name} onChange={change} maxLength={120} autoFocus required /></Form.Group>
        <Form.Group className="mb-3" controlId="projectDescription"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={change} maxLength={1000} /></Form.Group>
        <Form.Group controlId="projectStatus"><Form.Label>Estado</Form.Label><Form.Select name="status" value={form.status} onChange={change}>{PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}</Form.Select></Form.Group>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onHide} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Spinner size="sm" className="me-2" />}{project ? 'Guardar cambios' : 'Crear proyecto'}</Button></Modal.Footer>
    </Form>
  </Modal>;
};

export default ProjectFormModal;
