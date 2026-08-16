import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { roleService } from '../services';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: '' });
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    try {
      const { data } = await roleService.getAll();
      setRoles(data.roles);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', permissions: '' });
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: (role.permissions || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        permissions: form.permissions
          ? form.permissions.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      };

      if (editingRole) {
        await roleService.update(editingRole._id, payload);
      } else {
        await roleService.create(payload);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar rol');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este rol?')) return;
    try {
      await roleService.delete(id);
      fetchRoles();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar rol');
    }
  };

  if (loading) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Roles</h2>
          <p className="text-muted mb-0">Gestión de roles y permisos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> Nuevo rol
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Permisos</th>
                  <th>Fecha</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role._id}>
                    <td><span className="badge bg-primary">{role.name}</span></td>
                    <td>{role.description || '-'}</td>
                    <td>
                      {(role.permissions || []).map((p) => (
                        <span key={p} className="badge bg-light text-dark me-1">{p}</span>
                      ))}
                    </td>
                    <td>{new Date(role.createdAt).toLocaleDateString('es-AR')}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(role)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(role._id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">{editingRole ? 'Editar rol' : 'Nuevo rol'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Permisos <small className="text-muted">(separados por coma)</small></label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.permissions}
                      onChange={(e) => setForm({ ...form, permissions: e.target.value })}
                      placeholder="users:read, users:write"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Roles;
