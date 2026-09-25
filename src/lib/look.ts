import { ORGS } from '@/data/seed'
import { isDrug } from './domain'

/**
 * Two marks, one per kind of thing a store holds: medicine and materiel. The
 * precise category is already written under the item's name, so the icon only
 * has to carry the split the eye uses when scanning a stock list — and it is
 * the same split `isDrug` counts by on the facility cards above it.
 */
const DRUG = { icon: 'capsules', tone: 'tone-indigo' }
const SUPPLY = { icon: 'bandage-wound', tone: 'tone-teal' }

/** Icon and tint for an item: medicine, or medical materiel. */
export const itemLook = (item: string) => (isDrug(item) ? DRUG : SUPPLY)

/* A facility is either the hospital that issues or a sub-district unit that
   draws — worth telling apart at a glance in a list of a dozen. */
const HOSPITAL = { icon: 'hospital', tone: 'tone-indigo' }
const PCU = { icon: 'house-medical', tone: 'tone-teal' }

/** Icon and tint for an organisation, by what kind of place it is. */
export const orgLook = (org: string) =>
  (ORGS[org]?.type === 'PCU' ? PCU : HOSPITAL)
