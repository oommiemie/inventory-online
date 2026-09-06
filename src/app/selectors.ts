import type { DocState, Requisition, RoleId, Mapping, SupplyLink, ViewId } from '@/types'
import { ROLES, ORGS, WAREHOUSES } from '@/data/seed'
import { visibleDocs, approvableOrgs, supplyHospFor } from './store'

export const byState = (docs: Requisition[], role: RoleId, ...states: DocState[]) =>
  visibleDocs(docs, role).filter(d => states.includes(d.state))

/** The facility whose mapping list the current role edits. */
export const currentMapOrg = (role: RoleId, chosen: string) =>
  ROLES[role].scope === 'OWN_ORG' ? ROLES[role].org : chosen

/** Item mappings awaiting this role's approval. */
export const pendingItemMaps = (maps: Mapping[], role: RoleId, supply: SupplyLink[]) => {
  const orgs = approvableOrgs(role, supply)
  return maps
    .map((m, i) => ({ m, i }))
    .filter(x => x.m.state === 'PENDING_APPROVAL' && orgs.includes(x.m.org))
}

/** Warehouse code links awaiting approval within scope. */
export const pendingWhMaps = (role: RoleId, supply: SupplyLink[]) => {
  const r = ROLES[role]
  const orgs = approvableOrgs(role, supply)
  return Object.keys(WAREHOUSES).filter(w =>
    WAREHOUSES[w].mapState === 'PENDING_APPROVAL' &&
    (r.scope === 'ALL' || r.scope === 'PROVINCE' ||
     orgs.includes(WAREHOUSES[w].org) || WAREHOUSES[w].org === r.org))
}

/** Supply-warehouse requests awaiting the warehouse owner's approval. */
export const pendingSupply = (role: RoleId, supply: SupplyLink[]) => {
  const r = ROLES[role]
  return supply.filter(x =>
    x.state === 'PENDING_APPROVAL' &&
    (r.scope === 'ALL' || r.scope === 'PROVINCE' || WAREHOUSES[x.wh]?.org === r.org))
}

/** Badge count shown next to each sidebar item. */
export function navCount(
  view: ViewId, docs: Requisition[], role: RoleId, maps: Mapping[], supply: SupplyLink[],
  jobsFailed: number, mapOrg: string,
): number {
  switch (view) {
    case 'requisitions': return visibleDocs(docs, role).length
    case 'review':       return byState(docs, role, 'REQUESTED').length
    case 'issue':        return byState(docs, role, 'APPROVED', 'PARTIALLY_ISSUED').length
    case 'receive':      return byState(docs, role, 'ISSUED', 'PARTIALLY_RECEIVED', 'DISCREPANCY').length
    case 'matching': {
      const org = currentMapOrg(role, mapOrg)
      return maps.filter(m => m.org === org && ['UNMAPPED', 'DRAFT', 'REJECTED'].includes(m.state)).length
    }
    case 'mapapprove':
      return pendingItemMaps(maps, role, supply).length +
             pendingWhMaps(role, supply).length +
             pendingSupply(role, supply).length
    case 'monitor': return jobsFailed
    default: return 0
  }
}

/** Which screen a document belongs on, given its state. */
export const viewForDoc = (d: Requisition): ViewId =>
  ['DRAFT', 'RETURNED'].includes(d.state) ? 'requisitions'
  : d.state === 'REQUESTED' ? 'review'
  : ['APPROVED', 'PARTIALLY_ISSUED'].includes(d.state) ? 'issue'
  : ['ISSUED', 'PARTIALLY_RECEIVED', 'DISCREPANCY'].includes(d.state) ? 'receive'
  : 'requisitions'

/** PCU facilities the role may act for. */
export const pcuOrgs = () => Object.keys(ORGS).filter(o => ORGS[o].type === 'PCU')

export const facilitiesInScope = (role: RoleId, supply: SupplyLink[]) => {
  const r = ROLES[role]
  if (r.scope === 'OWN_ORG') return [r.org]
  if (r.scope === 'ALL' || r.scope === 'PROVINCE') return pcuOrgs()
  return pcuOrgs().filter(o => supplyHospFor(supply, o) === r.org || ORGS[o].parent === r.org)
}
