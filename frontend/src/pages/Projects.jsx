import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ButtonGroup, Form, InputGroup, Modal, Spinner as BootstrapSpinner } from 'react-bootstrap';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ProjectCard from '../projects/ProjectCard';
import ProjectList from '../projects/ProjectList';
import ProjectFormModal from '../projects/ProjectFormModal';
import { PROJECT_STATUSES } from '../projects/projectConstants';
import { projectService } from '../services';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('updatedAt-desc');
  const [view, setView] = useState(() => localStorage.getItem('projectsView') || 'cards');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadProjects = useCallback(async (signal) => {
    const [sortBy, order] = sort.split('-');
    try {
      const { data } = await projectService.list(
        { search: search || undefined, status: status || undefined, sortBy, order },
        { signal }
      );
      setProjects(data.projects);
      setError('');
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') setError(requestError.response?.data?.message || 'No se pudieron cargar los proyectos.');
    } finally { setLoading(false); }
  }, [search, status, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => loadProjects(controller.signal), 250);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [loadProjects]);

  const chooseView = (nextView) => { setView(nextView); localStorage.setItem('projectsView', nextView); };
  const startCreate = () => { setEditing(null); setFormOpen(true); };
  const startEdit = (project) => { setEditing(project); setFormOpen(true); };
  const save = async (form) => {
    if (editing) await projectService.update(editing._id, form); else await projectService.create(form);
    await loadProjects();
  };
  const duplicate = async (project) => {
    setWorking(true);
    try { await projectService.duplicate(project._id); await loadProjects(); } catch (requestError) { setError(requestError.response?.data?.message || 'No se pudo duplicar el proyecto.'); } finally { setWorking(false); }
  };
  const remove = async () => {
    setWorking(true);
    try { await projectService.remove(deleting._id); setDeleting(null); await loadProjects(); } catch (requestError) { setError(requestError.response?.data?.message || 'No se pudo eliminar el proyecto.'); } finally { setWorking(false); }
  };
  const actions = { onEdit: startEdit, onDuplicate: duplicate, onDelete: setDeleting };

  return <Layout>
    <div className="projects-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div><h2 className="mb-1">Mis Proyectos</h2><p className="text-muted mb-0">Gestioná tus planos de evacuación.</p></div>
      <Button onClick={startCreate}><i className="bi bi-plus-lg me-2" />Crear proyecto</Button>
    </div>

    <div className="projects-toolbar bg-white shadow-sm rounded p-3 mb-4 d-flex flex-wrap gap-2 align-items-center">
      <InputGroup className="project-search"><InputGroup.Text><i className="bi bi-search" /></InputGroup.Text><Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o descripción" aria-label="Buscar proyectos" /></InputGroup>
      <Form.Select className="project-filter" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado"><option value="">Todos los estados</option>{PROJECT_STATUSES.map((value) => <option key={value}>{value}</option>)}</Form.Select>
      <Form.Select className="project-sort" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar proyectos"><option value="updatedAt-desc">Modificación: más reciente</option><option value="updatedAt-asc">Modificación: más antigua</option><option value="createdAt-desc">Creación: más reciente</option><option value="createdAt-asc">Creación: más antigua</option></Form.Select>
      <ButtonGroup className="ms-auto" aria-label="Tipo de vista"><Button variant={view === 'cards' ? 'primary' : 'outline-secondary'} onClick={() => chooseView('cards')} aria-label="Vista en tarjetas"><i className="bi bi-grid" /></Button><Button variant={view === 'list' ? 'primary' : 'outline-secondary'} onClick={() => chooseView('list')} aria-label="Vista en lista"><i className="bi bi-list-ul" /></Button></ButtonGroup>
    </div>

    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    {loading ? <Spinner /> : projects.length === 0 ? <div className="project-empty bg-white rounded shadow-sm text-center p-5"><i className="bi bi-folder2-open" /><h4>{search || status ? 'No encontramos proyectos' : 'Todavía no tenés proyectos'}</h4><p className="text-muted">{search || status ? 'Probá cambiando los filtros de búsqueda.' : 'Creá el primero para comenzar tu plano de evacuación.'}</p>{!search && !status && <Button onClick={startCreate}>Crear proyecto</Button>}</div>
      : view === 'cards' ? <div className="row g-4">{projects.map((project) => <div className="col-sm-6 col-xl-4 col-xxl-3" key={project._id}><ProjectCard project={project} {...actions} /></div>)}</div>
        : <ProjectList projects={projects} {...actions} />}

    <ProjectFormModal show={formOpen} project={editing} onHide={() => setFormOpen(false)} onSubmit={save} />
    <Modal show={Boolean(deleting)} onHide={() => !working && setDeleting(null)} centered>
      <Modal.Header closeButton><Modal.Title>Eliminar proyecto</Modal.Title></Modal.Header>
      <Modal.Body>¿Querés eliminar <strong>{deleting?.name}</strong>? Esta acción no se puede deshacer.</Modal.Body>
      <Modal.Footer><Button variant="light" onClick={() => setDeleting(null)} disabled={working}>Cancelar</Button><Button variant="danger" onClick={remove} disabled={working}>{working && <BootstrapSpinner size="sm" className="me-2" />}Eliminar</Button></Modal.Footer>
    </Modal>
  </Layout>;
};

export default Projects;
