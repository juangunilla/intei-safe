export const PROJECT_STATUSES = ['Borrador', 'En proceso', 'Finalizado'];

export const statusVariant = {
  Borrador: 'secondary',
  'En proceso': 'warning',
  Finalizado: 'success',
};

export const formatDate = (value) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));
