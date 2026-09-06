import { useRef, useState } from 'react'
import { useStore } from '@/app/store'
import { ROLES } from '@/data/seed'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, Field, Input, Switch, Badge } from '@/components/ui'
import { asset } from '@/lib/asset'

/** Settings › My account: the signed-in user's own profile, password,
 *  notification choices and devices. Prototype: everything lives in the store. */
export function AccountPanel() {
  const { t, lang, orgName } = useT()
  const role = useStore(s => s.role)
  const profile = useStore(s => s.profile)
  const setProfile = useStore(s => s.setProfile)
  const toast = useStore(s => s.toast)
  const me = ROLES[role]

  /* ---- profile: read-only view first; the form appears on Edit ---- */
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: profile.name, nameEn: profile.nameEn, email: profile.email, phone: profile.phone,
  })
  const dirty = (['name', 'nameEn', 'email', 'phone'] as const).some(k => form[k] !== profile[k])
  const reset = () => setForm({ name: profile.name, nameEn: profile.nameEn, email: profile.email, phone: profile.phone })
  const cancelEdit = () => { reset(); setEditing(false) }
  const save = () => { setProfile(form); setEditing(false); toast(t('acct.saved')) }

  const fileRef = useRef<HTMLInputElement>(null)
  const pickPhoto = (f?: File) => {
    if (!f) return
    if (f.size > 2 * 1024 * 1024) { toast(t('acct.photoHint'), 'warn'); return }
    const rd = new FileReader()
    rd.onload = () => setProfile({ avatar: String(rd.result) })
    rd.readAsDataURL(f)
  }

  /* ---- password: collapsed row until requested ---- */
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' })
  const weak = pw.next.length > 0 && !(pw.next.length >= 8 && /\d/.test(pw.next))
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next
  const canChange = !!pw.cur && !!pw.next && !!pw.confirm && !weak && !mismatch
  const closePw = () => { setPw({ cur: '', next: '', confirm: '' }); setPwOpen(false) }
  const changePw = () => { closePw(); toast(t('acct.pwChanged')) }

  return (
    <>
      <Card>
        <PanelHead title={t('acct.profile')} sub={t('acct.profileDesc')}>
          {!editing && <Button size="sm" onClick={() => setEditing(true)}>{t('c.edit')}</Button>}
        </PanelHead>
        <div className="panel-body acct-profile">
          <div className="acct-photo">
            <div className="acct-photo-img">
              {profile.avatar
                ? <img src={profile.avatar} alt="" />
                : (
                  <picture>
                    <source srcSet={asset("/img/avatar.webp")} type="image/webp" />
                    <img src={asset("/img/avatar.png")} alt="" />
                  </picture>
                )}
            </div>
            {editing ? (
              <div className="acct-photo-actions">
                <Button size="sm" onClick={() => fileRef.current?.click()}>{t('acct.changePhoto')}</Button>
                {profile.avatar && (
                  <Button size="sm" variant="ghost" onClick={() => setProfile({ avatar: '' })}>{t('acct.removePhoto')}</Button>
                )}
                <small>{t('acct.photoHint')}</small>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden
                       onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
              </div>
            ) : (
              <div className="acct-identity">
                <b>{lang === 'EN' ? profile.nameEn : profile.name}</b>
                <small>{lang === 'EN' ? me.label : me.labelTh} · {orgName(me.org)}</small>
              </div>
            )}
          </div>

          {editing ? (<>
            <div className="acct-form">
              <Field label={t('acct.nameTh')}>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label={t('acct.nameEn')}>
                <Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
              </Field>
              <Field label={t('acct.email')}>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label={t('acct.phone')}>
                <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label={t('acct.role')} hint={t('acct.readonly')}>
                <Input value={lang === 'EN' ? me.label : me.labelTh} readOnly />
              </Field>
              <Field label={t('user.org')} hint={t('acct.readonly')}>
                <Input value={orgName(me.org)} readOnly />
              </Field>
            </div>
            <div className="acct-actions">
              <Button variant="ghost" onClick={cancelEdit}>{t('c.cancel')}</Button>
              <Button variant="primary" disabled={!dirty} onClick={save}>{t('acct.save')}</Button>
            </div>
          </>) : (
            <dl className="acct-view">
              <div><dt>{t('acct.nameTh')}</dt><dd>{profile.name}</dd></div>
              <div><dt>{t('acct.nameEn')}</dt><dd>{profile.nameEn}</dd></div>
              <div><dt>{t('acct.email')}</dt><dd>{profile.email || '—'}</dd></div>
              <div><dt>{t('acct.phone')}</dt><dd>{profile.phone || '—'}</dd></div>
              <div><dt>{t('acct.role')}</dt><dd>{lang === 'EN' ? me.label : me.labelTh}</dd></div>
              <div><dt>{t('user.org')}</dt><dd>{orgName(me.org)}</dd></div>
            </dl>
          )}
        </div>
      </Card>

      <Card>
        <PanelHead title={t('acct.security')} sub={t('acct.securityDesc')} />
        <div className="panel-body set-rows">
          {pwOpen ? (
            <div className="set-row set-row--stack">
              <div className="acct-form acct-pw">
                <Field label={t('acct.curPw')}>
                  <Input type="password" autoComplete="current-password" value={pw.cur}
                         onChange={e => setPw({ ...pw, cur: e.target.value })} />
                </Field>
                <Field label={t('acct.newPw')} hint={weak ? undefined : t('acct.pwHint')}
                       error={weak ? t('acct.pwWeak') : undefined}>
                  <Input type="password" autoComplete="new-password" value={pw.next}
                         onChange={e => setPw({ ...pw, next: e.target.value })} />
                </Field>
                <Field label={t('acct.confirmPw')} error={mismatch ? t('acct.pwMismatch') : undefined}>
                  <Input type="password" autoComplete="new-password" value={pw.confirm}
                         onChange={e => setPw({ ...pw, confirm: e.target.value })} />
                </Field>
              </div>
              <div className="acct-actions">
                <Button variant="ghost" onClick={closePw}>{t('c.cancel')}</Button>
                <Button variant="primary" disabled={!canChange} onClick={changePw}>{t('acct.changePw')}</Button>
              </div>
            </div>
          ) : (
            <div className="set-row">
              <div className="set-row-main">
                <b>{t('acct.password')}</b>
                <small>•••••••• · {t('acct.pwLast')}</small>
              </div>
              <Button size="sm" onClick={() => setPwOpen(true)}>{t('acct.changePw')}</Button>
            </div>
          )}
          <div className="set-row">
            <div className="set-row-main">
              <b>{t('acct.twoFactor')}</b>
              <small>{t('acct.twoFactorDesc')}</small>
            </div>
            <Switch checked={profile.twoFactor} ariaLabel={t('acct.twoFactor')}
                    onChange={v => setProfile({ twoFactor: v })} />
          </div>
        </div>
      </Card>

      <Card>
        <PanelHead title={t('acct.sessions')} sub={t('acct.sessionsDesc')} />
        <div className="panel-body set-rows">
          <div className="set-row">
            <div className="set-row-main">
              <b>{t('acct.thisDevice')} <Badge tone="green">{t('acct.active')}</Badge></b>
              <small>{t('acct.thisDeviceDesc')}</small>
            </div>
            <Button variant="danger" size="sm" onClick={() => toast(t('acct.signedOutAll'))}>
              {t('acct.signOutAll')}
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}
