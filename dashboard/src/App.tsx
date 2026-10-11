import { HashRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Shell } from './components/Shell'
import { ToastProvider } from './components/ui'
import Overview from './pages/Overview'
import Feed from './pages/Feed'
import Traces from './pages/Traces'
import Approvals from './pages/Approvals'
import Agents from './pages/Agents'

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 2000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Overview />} />
              <Route path="feed" element={<Feed />} />
              <Route path="traces" element={<Traces />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="agents" element={<Agents />} />
              <Route path="*" element={<Overview />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
