const Spinner = ({ fullScreen = false }) => {
  const wrapperClass = fullScreen
    ? 'd-flex justify-content-center align-items-center vh-100'
    : 'd-flex justify-content-center p-4';

  return (
    <div className={wrapperClass}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>
  );
};

export default Spinner;
