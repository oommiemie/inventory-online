import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '@/app/store'
import { Sidebar } from './Sidebar'
import { ToastRegion } from './ToastRegion'
import { Spotlight } from '@/features/spotlight/Spotlight'
import './layout.css'

/** Lets any page's HeroBar open the mobile drawer. */
const MenuContext = createContext<() => void>(() => {})
export const useMenuToggle = () => useContext(MenuContext)

/** Lets any page open the Spotlight palette. */
const SpotlightContext = createContext<() => void>(() => {})
export const useSpotlight = () => useContext(SpotlightContext)

export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useStore(s => s.sidebarCollapsed)
  const [drawer, setDrawer] = useState(false)
  const [spotlight, setSpotlight] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
      // Cmd/Ctrl + K opens search from anywhere, like a native app.
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSpotlight(o => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar open={drawer} onNavigate={() => setDrawer(false)} />
      {drawer && <div className="scrim" style={{ opacity: 1, pointerEvents: 'auto' }}
                      onClick={() => setDrawer(false)} role="presentation" />}
      <div className="main">
        <main className="content" id="main">
          <MenuContext.Provider value={() => setDrawer(d => !d)}>
            <SpotlightContext.Provider value={() => setSpotlight(true)}>
              {children}
            </SpotlightContext.Provider>
          </MenuContext.Provider>
        </main>
      </div>
      <Spotlight open={spotlight} onClose={() => setSpotlight(false)} />
      <ToastRegion />
    </div>
  )
}
