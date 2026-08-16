import { Badge, Table } from 'react-bootstrap';
import ProjectActions from './ProjectActions';
import { formatDate, statusVariant } from './projectConstants';

const ProjectList = ({ projects, ...actions }) => <div className="table-responsive bg-white rounded shadow-sm">
  <Table hover className="align-middle mb-0 project-table">
    <thead><tr><th>Proyecto</th><th>Estado</th><th>Propietario</th><th>Creado</th><th>Modificado</th><th><span className="visually-hidden">Acciones</span></th></tr></thead>
    <tbody>{projects.map((project) => <tr key={project._id}>
      <td><div className="d-flex align-items-center gap-3">
        {project.thumbnail ? <img className="project-list-thumbnail" src={project.thumbnail} alt="" /> : <span className="project-list-thumbnail project-thumbnail-empty"><i className="bi bi-map" /></span>}
        <div><strong>{project.name}</strong><small className="d-block text-muted text-truncate project-list-description">{project.description || 'Sin descripción'}</small></div>
      </div></td>
      <td><Badge bg={statusVariant[project.status]}>{project.status}</Badge></td>
      <td>{project.owner?.name}</td>
      <td className="text-nowrap">{formatDate(project.createdAt)}</td>
      <td className="text-nowrap">{formatDate(project.updatedAt)}</td>
      <td><ProjectActions compact project={project} {...actions} /></td>
    </tr>)}</tbody>
  </Table>
</div>;

export default ProjectList;
