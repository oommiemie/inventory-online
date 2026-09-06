import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useRipple } from '@/hooks/useRipple'
import { useStore } from '@/app/store'
import { LoginView } from '@/features/auth/LoginView'
import { AppShell } from '@/components/layout/AppShell'
import { Guard } from './Guard'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { RequisitionsView } from '@/features/requisitions/RequisitionsView'
import { ReviewView } from '@/features/review/ReviewView'
import { IssueView } from '@/features/issue/IssueView'
import { ReceiveView } from '@/features/receive/ReceiveView'
import { StockView } from '@/features/stock/StockView'
import { MatchingView } from '@/features/mapping/MatchingView'
import { MapApprovalView } from '@/features/mapping/MapApprovalView'
import { ReferenceView } from '@/features/reference/ReferenceView'
import { MonitorView } from '@/features/monitor/MonitorView'
import { ReportsView } from '@/features/reports/ReportsView'
import { SettingsView } from '@/features/settings/SettingsView'

export function App() {
  useRipple()
  const signedIn = useStore(s => s.signedIn)

  /* The current hash is kept while signed out, so a deep link lands after sign-in. */
  if (!signedIn) return <HashRouter><LoginView /></HashRouter>

  return (
    <HashRouter>
      <AppShell>
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
      </AppShell>
    </HashRouter>
  )
}
