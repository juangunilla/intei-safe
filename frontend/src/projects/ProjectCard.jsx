import { Badge, Card } from 'react-bootstrap';
import ProjectActions from './ProjectActions';
import { formatDate, statusVariant } from './projectConstants';

const ProjectThumbnail = ({ project }) => project.thumbnail
  ? <Card.Img className="project-thumbnail" variant="top" src={project.thumbnail} alt={`Miniatura de ${project.name}`} />
  : <div className="project-thumbnail project-thumbnail-empty"><i className="bi bi-map" /><span>Sin miniatura</span></div>;

const ProjectCard = ({ project, ...actions }) => <Card className="project-card border-0 shadow-sm h-100">
  <ProjectThumbnail project={project} />
  <Card.Body className="d-flex flex-column">
    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
      <Card.Title className="h5 mb-0 text-truncate" title={project.name}>{project.name}</Card.Title>
      <Badge bg={statusVariant[project.status]}>{project.status}</Badge>
    </div>
    <Card.Text className="text-muted project-description flex-grow-1">{project.description || 'Sin descripción'}</Card.Text>
    <div className="project-meta mb-3">
      <span><i className="bi bi-clock me-1" />Modificado {formatDate(project.updatedAt)}</span>
      <span><i className="bi bi-person me-1" />{project.owner?.name}</span>
    </div>
    <ProjectActions project={project} {...actions} />
  </Card.Body>
</Card>;

export default ProjectCard;
