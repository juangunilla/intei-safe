import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="min-vh-100 bg-light">
      <Navbar />
      <main id="main-content" className="container-fluid py-4 px-4">{children}</main>
    </div>
  );
};

export default Layout;
