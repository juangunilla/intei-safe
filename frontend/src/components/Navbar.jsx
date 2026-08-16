import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark app-navbar">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/dashboard">
          <img className="app-navbar-logo" src="/branding/inteli-safe-logo.png" alt="Logo de Inteli -Safe" />
          <span>Inteli -Safe</span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Abrir navegación"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/dashboard">
                <i className="bi bi-speedometer2 me-1"></i> Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/projects">
                <i className="bi bi-folder2-open me-1"></i> Mis Proyectos
              </Link>
            </li>
            {isAdmin() && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/users">
                    <i className="bi bi-people me-1"></i> Usuarios
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/roles">
                    <i className="bi bi-shield-check me-1"></i> Roles
                  </Link>
                </li>
              </>
            )}
          </ul>
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <button className="nav-link dropdown-toggle border-0 bg-transparent" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="bi bi-person-circle me-1"></i>
                {user?.name}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <span className="dropdown-item-text text-muted small">{user?.email}</span>
                </li>
                <li>
                  <span className="dropdown-item-text">
                    <span className="badge bg-secondary">{user?.role?.name}</span>
                  </span>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-1"></i> Cerrar sesión
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
