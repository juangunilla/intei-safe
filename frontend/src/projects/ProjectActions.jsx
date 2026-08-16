import { Button, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const ProjectActions = ({ project, onEdit, onDuplicate, onDelete, compact = false }) => {
  const navigate = useNavigate();
  const open = () => navigate(`/projects/${project._id}/editor`);

  if (!compact) {
    return <div className="d-flex gap-2">
      <Button variant="primary" size="sm" onClick={open}><i className="bi bi-folder2-open me-1" />Abrir</Button>
      <Dropdown align="end">
        <Dropdown.Toggle variant="light" size="sm" aria-label={`Acciones de ${project.name}`}><i className="bi bi-three-dots" /></Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => onEdit(project)}><i className="bi bi-pencil me-2" />Editar</Dropdown.Item>
          <Dropdown.Item onClick={() => onDuplicate(project)}><i className="bi bi-copy me-2" />Duplicar</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item className="text-danger" onClick={() => onDelete(project)}><i className="bi bi-trash me-2" />Eliminar</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>;
  }

  return <div className="d-flex gap-1 justify-content-end">
    <Button variant="outline-primary" size="sm" onClick={open}>Abrir</Button>
    <Button variant="link" size="sm" aria-label="Editar" onClick={() => onEdit(project)}><i className="bi bi-pencil" /></Button>
    <Button variant="link" size="sm" aria-label="Duplicar" onClick={() => onDuplicate(project)}><i className="bi bi-copy" /></Button>
    <Button variant="link" size="sm" className="text-danger" aria-label="Eliminar" onClick={() => onDelete(project)}><i className="bi bi-trash" /></Button>
  </div>;
};

export default ProjectActions;
