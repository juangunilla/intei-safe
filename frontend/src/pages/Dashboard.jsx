import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import DashboardProjectItem from '../dashboard/DashboardProjectItem';
import ProjectFormModal from '../projects/ProjectFormModal';
import { PROJECT_STATUSES } from '../projects/projectConstants';
import { useAuth } from '../context/AuthContext';
import { projectService } from '../services';

const DashboardSection = ({ title, subtitle, projects, dateField }) => <section className="dashboard-panel">
  <div className="dashboard-panel-header">
    <div><h2>{title}</h2><p>{subtitle}</p></div>
    <Link to="/projects">Ver todos <i className="bi bi-arrow-right" /></Link>
  </div>
  <div className="dashboard-project-list">
    {projects.length
      ? projects.map((project) => <DashboardProjectItem key={project._id} project={project} dateField={dateField} />)
      : <div className="dashboard-section-empty"><i className="bi bi-inbox" /><span>No hay proyectos que coincidan.</span></div>}
  </div>
</section>;

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await projectService.list({ sortBy: 'updatedAt', order: 'desc' });
      setProjects(data.projects);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo cargar el dashboard.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return projects.filter((project) => {
      const matchesStatus = !status || project.status === status;
      const matchesSearch = !term || `${project.name} ${project.description}`.toLocaleLowerCase('es').includes(term);
      const matchesPeriod = !period || new Date(project.updatedAt) >= new Date(Date.now() - Number(period) * 86400000);
      return matchesStatus && matchesSearch && matchesPeriod;
    });
  }, [projects, search, status, period]);

  const recentProjects = useMemo(() => [...filteredProjects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4), [filteredProjects]);
  const modifiedProjects = useMemo(() => [...filteredProjects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4), [filteredProjects]);
  const saveProject = async (form) => { await projectService.create(form); await loadProjects(); };

  if (loading) return <Layout><Spinner /></Layout>;

  return <Layout>
    <div className="dashboard-shell">
      <header className="dashboard-heading">
        <div><span className="dashboard-eyebrow">Espacio de trabajo</span><h1>Hola, {user?.name?.split(' ')[0]}</h1><p>Una vista clara de tus planos de evacuación.</p></div>
        <Button className="dashboard-create" onClick={() => setFormOpen(true)}><i className="bi bi-plus-lg" />Nuevo proyecto</Button>
      </header>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <section className="dashboard-overview">
        <div className="dashboard-stat">
          <div className="dashboard-stat-icon"><i className="bi bi-folder2" /></div>
          <div><span>Proyectos</span><strong>{projects.length}</strong><small>Total en tu espacio</small></div>
        </div>
        <button className="dashboard-quick-action" type="button" onClick={() => setFormOpen(true)}>
          <span><i className="bi bi-plus-lg" /></span>
          <div><strong>Crear proyecto</strong><small>Comenzar un nuevo plano</small></div>
          <i className="bi bi-arrow-up-right" />
        </button>
      </section>

      <div className="dashboard-controls">
        <InputGroup className="dashboard-search"><InputGroup.Text><i className="bi bi-search" /></InputGroup.Text><Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proyectos…" aria-label="Buscar proyectos" />{search && <Button variant="light" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><i className="bi bi-x-lg" /></Button>}</InputGroup>
        <Form.Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado"><option value="">Todos los estados</option>{PROJECT_STATUSES.map((value) => <option key={value}>{value}</option>)}</Form.Select>
        <Form.Select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filtrar por actividad"><option value="">Cualquier fecha</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></Form.Select>
      </div>

      <div className="dashboard-grid">
        <DashboardSection title="Proyectos recientes" subtitle="Creados más recientemente" projects={recentProjects} dateField="createdAt" />
        <DashboardSection title="Últimos modificados" subtitle="Actividad más reciente" projects={modifiedProjects} dateField="updatedAt" />
      </div>
    </div>
    <ProjectFormModal show={formOpen} onHide={() => setFormOpen(false)} onSubmit={saveProject} />
  </Layout>;
};

export default Dashboard;
