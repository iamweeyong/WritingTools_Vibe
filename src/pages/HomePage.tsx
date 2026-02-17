import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="padded">
      <div className="home-hero">
        <h1>WritingTools Vibe</h1>
        <p>
          Local-first screenwriting studio with PKM, synopsis boards, and
          research tools.
        </p>
        <div className="home-links">
          <Link to="/projects" className="btn btn-primary">
            Script Studio
          </Link>
          <Link to="/notes" className="btn">
            Knowledge Studio
          </Link>
          <Link to="/research" className="btn">
            Research
          </Link>
        </div>
      </div>
    </div>
  );
}
