import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { AppLayout } from '../components/AppLayout'
import { useAppStore } from '../lib/store'

const rootRoute = createRootRoute({
  component: AppLayout
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <h2>Home</h2>
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: () => {
    const projects = useAppStore((state) => state.projects)
    return (
      <section>
        <h2>Projects</h2>
        {projects.length === 0 ? <p>No projects yet.</p> : <p>{projects.length} projects</p>}
      </section>
    )
  }
})

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$id',
  component: () => {
    const { id } = projectDetailRoute.useParams()
    return (
      <section>
        <h2>Project {id}</h2>
        <p>Empty state.</p>
      </section>
    )
  }
})

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  component: () => {
    const notes = useAppStore((state) => state.notes)
    return (
      <section>
        <h2>Notes</h2>
        {notes.length === 0 ? <p>No notes yet.</p> : <p>{notes.length} notes</p>}
      </section>
    )
  }
})

const noteDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes/$id',
  component: () => {
    const { id } = noteDetailRoute.useParams()
    return (
      <section>
        <h2>Note {id}</h2>
        <p>Empty state.</p>
      </section>
    )
  }
})

const outputDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/outputs/$id',
  component: () => {
    const { id } = outputDetailRoute.useParams()
    return (
      <section>
        <h2>Output {id}</h2>
        <p>Generate or export content from here.</p>
      </section>
    )
  }
})

const researchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/research',
  component: () => (
    <section>
      <h2>Research</h2>
      <p>Research workspace starts empty.</p>
    </section>
  )
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  projectsRoute,
  projectDetailRoute,
  notesRoute,
  noteDetailRoute,
  outputDetailRoute,
  researchRoute
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
