import { Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { formatDate, statusVariant } from '../projects/projectConstants';

const DashboardProjectItem = ({ project, dateField }) => {
  const navigate = useNavigate();
  const label = dateField === 'createdAt' ? 'Creado' : 'Modificado';

  return <button className="dashboard-project-item" type="button" onClick={() => navigate(`/projects/${project._id}/editor`)}>
    {project.thumbnail
      ? <img src={project.thumbnail} alt="" className="dashboard-project-thumb" />
      : <span className="dashboard-project-thumb dashboard-project-placeholder"><i className="bi bi-map" /></span>}
    <span className="dashboard-project-copy">
      <span className="dashboard-project-title">{project.name}</span>
      <span className="dashboard-project-description">{project.description || 'Sin descripción'}</span>
    </span>
    <Badge bg={statusVariant[project.status]} className="dashboard-status">{project.status}</Badge>
    <span className="dashboard-project-date">{label} {formatDate(project[dateField])}</span>
    <i className="bi bi-chevron-right dashboard-project-arrow" />
  </button>;
};

export default DashboardProjectItem;
