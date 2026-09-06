import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTE_OF } from '@/app/nav'
import type { ViewId } from '@/types'

/** Every list route, longest first so `/map-approval` beats `/map`. */
const MENU_ROUTES = (Object.entries(ROUTE_OF) as [ViewId, string][])
  .sort((a, b) => b[1].length - a[1].length)

const menuOf = (path: string): ViewId | null => {
  if (path === '/' || path === '') return 'dashboard'
  const hit = MENU_ROUTES.find(([, r]) => r !== '/' && path.startsWith(r))
  return hit ? hit[0] : null
}

/**
 * The sidebar entry to keep highlighted.
 *
 * A document opens on whichever screen handles its current state, so the URL
 * alone would move the highlight away from the menu the user actually clicked
 * from. While a detail route is open we hold the last list route they were on;
 * on a list route the URL speaks for itself.
 */
export function useOriginMenu(): ViewId | null {
  const { pathname } = useLocation()
  const lastList = useRef<ViewId | null>(null)

  const here = menuOf(pathname)
  // A detail route has a segment after the list route (e.g. /review/REQ-123).
  const isDetail = here !== null && here !== 'dashboard' &&
    pathname.replace(ROUTE_OF[here], '').replace(/^\//, '').length > 0

  useEffect(() => {
    if (!isDetail && here) lastList.current = here
  }, [isDetail, here])

  if (!isDetail) return here
  return lastList.current ?? here
}
