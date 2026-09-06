import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useRipple } from '@/hooks/useRipple'
import { useStore } from '@/app/store'
import { LoginView } from '@/features/auth/LoginView'
import { AppShell } from '@/components/layout/AppShell'
import { Guard } from './Guard'
import { ErrorBoundary } from './ErrorBoundary'

/* Screens load on first visit rather than up front: the sign-in page and shell
   are all that a cold start needs. Named exports are unwrapped here because
   React.lazy expects a default. */
const DashboardView = lazy(() => import('@/features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })))
const RequisitionsView = lazy(() => import('@/features/requisitions/RequisitionsView').then(m => ({ default: m.RequisitionsView })))
const ReviewView = lazy(() => import('@/features/review/ReviewView').then(m => ({ default: m.ReviewView })))
const IssueView = lazy(() => import('@/features/issue/IssueView').then(m => ({ default: m.IssueView })))
const ReceiveView = lazy(() => import('@/features/receive/ReceiveView').then(m => ({ default: m.ReceiveView })))
const StockView = lazy(() => import('@/features/stock/StockView').then(m => ({ default: m.StockView })))
const MatchingView = lazy(() => import('@/features/mapping/MatchingView').then(m => ({ default: m.MatchingView })))
const MapApprovalView = lazy(() => import('@/features/mapping/MapApprovalView').then(m => ({ default: m.MapApprovalView })))
const ReferenceView = lazy(() => import('@/features/reference/ReferenceView').then(m => ({ default: m.ReferenceView })))
const MonitorView = lazy(() => import('@/features/monitor/MonitorView').then(m => ({ default: m.MonitorView })))
const ReportsView = lazy(() => import('@/features/reports/ReportsView').then(m => ({ default: m.ReportsView })))
const SettingsView = lazy(() => import('@/features/settings/SettingsView').then(m => ({ default: m.SettingsView })))

export function App() {
  useRipple()
  const signedIn = useStore(s => s.signedIn)

  /* The current hash is kept while signed out, so a deep link lands after sign-in. */
  if (!signedIn) return <ErrorBoundary><HashRouter><LoginView /></HashRouter></ErrorBoundary>

  return (
    <ErrorBoundary>
    <HashRouter>
      <AppShell>
        <Suspense fallback={<div className="route-loading" role="status" aria-live="polite" />}>
        <Routes>
          <Route path="/"                   element={<Guard view="dashboard"><DashboardView /></Guard>} />
          <Route path="/requisitions"       element={<Guard view="requisitions"><RequisitionsView /></Guard>} />
          <Route path="/requisitions/:no"   element={<Guard view="requisitions"><RequisitionsView /></Guard>} />
          <Route path="/review"             element={<Guard view="review"><ReviewView /></Guard>} />
          <Route path="/review/:no"         element={<Guard view="review"><ReviewView /></Guard>} />
          <Route path="/issue"              element={<Guard view="issue"><IssueView /></Guard>} />
          <Route path="/issue/:no"          element={<Guard view="issue"><IssueView /></Guard>} />
          <Route path="/receive"            element={<Guard view="receive"><ReceiveView /></Guard>} />
          <Route path="/receive/:no"        element={<Guard view="receive"><ReceiveView /></Guard>} />
          <Route path="/stock"              element={<Guard view="stock"><StockView /></Guard>} />
          <Route path="/matching"           element={<Guard view="matching"><MatchingView /></Guard>} />
          <Route path="/mapping-approval"   element={<Guard view="mapapprove"><MapApprovalView /></Guard>} />
          <Route path="/reference"          element={<Guard view="reference"><ReferenceView /></Guard>} />
          <Route path="/monitor"            element={<Guard view="monitor"><MonitorView /></Guard>} />
          <Route path="/reports"            element={<Guard view="reports"><ReportsView /></Guard>} />
          <Route path="/settings"           element={<Guard view="settings"><SettingsView /></Guard>} />
          <Route path="/settings/:topic"    element={<Guard view="settings"><SettingsView /></Guard>} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AppShell>
    </HashRouter>
    </ErrorBoundary>
  )
}
