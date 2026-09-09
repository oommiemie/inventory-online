import { createPortal } from 'react-dom'
import type { Requisition } from '@/types'
import { useStore } from '@/app/store'
import { ORGS, WAREHOUSES } from '@/data/seed'
import { M, num, money, toLocal, uomOf } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import './docprint.css'

/**
 * The document as a sheet of paper. It is portalled next to the app rather
 * than into it, so printing is a matter of hiding one element and showing the
 * other — and the browser's own "Save as PDF" writes the file. A PDF built in
 * JavaScript would mean shipping a Thai font and laying out the text by hand;
 * the print pipeline already does both, correctly.
 */
export function DocPrintSheet({ doc }: { doc: Requisition }) {
  const { t, orgName, whName, itemName, uomName, lang } = useT()
  const maps = useStore(s => s.mappings)

  const owner = WAREHOUSES[doc.whFrom]?.org
  const value = doc.lines.reduce((a, l) => a + M(l.item).price * (l.approved || l.req), 0)
  const signatures = [t('prn.signRequester'), t('prn.signApprover'), t('prn.signIssuer'), t('prn.signReceiver')]

  return createPortal(
    <article className="print-sheet" lang={lang === 'EN' ? 'en' : 'th'} aria-hidden="true">
      <header className="print-head">
        <div>
          <h1>{t('prn.title')}</h1>
          <p>{owner ? orgName(owner) : ''}{owner && ORGS[doc.org] ? ' · ' : ''}{ORGS[doc.org] ? orgName(doc.org) : ''}</p>
        </div>
        <div className="print-no">
          <span>{t('req.no')}</span>
          <strong>{doc.no}</strong>
        </div>
      </header>

      <dl className="print-meta">
        <div><dt>{t('req.facility')}</dt><dd>{orgName(doc.org)}</dd></div>
        <div><dt>{t('req.whFrom')}</dt><dd>{whName(doc.whFrom)}</dd></div>
        <div><dt>{t('req.whTo')}</dt><dd>{whName(doc.whTo)}</dd></div>
        <div><dt>{t('req.created')}</dt><dd>{doc.created}</dd></div>
        <div><dt>{t('c.status')}</dt><dd>{t(`st.${doc.state}`)}</dd></div>
        <div><dt>{t('iss.extRef')}</dt><dd>{doc.extRef || '—'}</dd></div>
      </dl>

      <table className="print-table">
        <thead>
          <tr>
            <th className="print-no-col">#</th>
            <th>{t('c.items')}</th>
            <th>{t('req.localUnit')}</th>
            <th className="r">{t('req.reqQty')}</th>
            <th className="r">{t('rev.approvedQty')}</th>
            <th className="r">{t('rcv.issuedQty')}</th>
            <th className="r">{t('rcv.actualQty')}</th>
          </tr>
        </thead>
        <tbody>
          {/* Quantities are printed in base units, the way the screen shows
              them, with the requisition unit and its size named alongside —
              printing the local figure alone would put fractions on a form
              people sign. */}
          {doc.lines.map((l, i) => {
            const u = uomOf(maps, doc.org, l.item)
            return (
              <tr key={l.item}>
                <td className="print-no-col">{i + 1}</td>
                <td>
                  <strong>{M(l.item).code}</strong><br />
                  {itemName(l.item)}
                </td>
                <td>
                  {num(toLocal(maps, doc.org, l.item, l.req))} {u.uom}
                  <br /><span className="print-uom">1 {u.uom} = {num(u.factor)} {uomName(l.item)}</span>
                </td>
                <td className="r">{num(l.req)}</td>
                <td className="r">{num(l.approved)}</td>
                <td className="r">{l.issued ? num(l.issued) : '—'}</td>
                <td className="r">{l.received ? num(l.received) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>{t('rep.totalValue')}</td>
            <td className="r" colSpan={4}>{t('c.baht')} {money(value)}</td>
          </tr>
        </tfoot>
      </table>

      {doc.note && <p className="print-note"><strong>{t('c.note')}:</strong> {doc.note}</p>}

      <div className="print-signs">
        {signatures.map(s => (
          <div key={s}>
            <span className="print-rule" />
            <span>{s}</span>
            <span className="print-date">{t('prn.signDate')}</span>
          </div>
        ))}
      </div>

      <footer className="print-foot">
        {t('app.name')} · {t('app.tagline')} — {t('prn.printedFrom')}
      </footer>
    </article>,
    document.body,
  )
}
