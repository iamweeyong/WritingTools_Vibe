import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ScriptStudioPage } from './pages/ScriptStudioPage';
import { NotesPage } from './pages/NotesPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { OutputPage } from './pages/OutputPage';
import { ResearchPage } from './pages/ResearchPage';
import { ConfirmDialog } from './components/ConfirmDialog';
import { initDb } from './lib/db';
import './styles/app.css';

void initDb();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ScriptStudioPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteEditorPage />} />
          <Route path="/outputs/:id" element={<OutputPage />} />
          <Route path="/research" element={<ResearchPage />} />
        </Route>
      </Routes>
      <ConfirmDialog />
    </BrowserRouter>
  </React.StrictMode>,
);
