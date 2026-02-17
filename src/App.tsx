import { NavLink, Outlet } from 'react-router-dom';

export function App() {
  return (
    <>
      <nav className="topnav">
        <span className="app-title">WritingTools</span>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/projects">Projects</NavLink>
        <NavLink to="/notes">Notes</NavLink>
        <NavLink to="/research">Research</NavLink>
      </nav>
      <div className="app-content">
        <Outlet />
      </div>
    </>
  );
}
