import { useRef, useState } from 'react'
import { useStore } from '@/app/store'
import { ROLES } from '@/data/seed'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, Field, Input, Badge } from '@/components/ui'
import { asset } from '@/lib/asset'

/** Settings › My account. Provider ID owns the identity, so the name is shown
 *  rather than edited and there is no password here; what remains is the
 *  contact details, the link status and the devices. */
export function AccountPanel() {
  const { t, lang, orgName } = useT()
  const role = useStore(s => s.role)
  const profile = useStore(s => s.profile)
  const setProfile = useStore(s => s.setProfile)
  const toast = useStore(s => s.toast)
  const me = ROLES[role]

  /* Name and role come from Provider ID; only the contact details are ours to
     edit, so the form covers those alone. */
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ email: profile.email, phone: profile.phone })
  const dirty = (['email', 'phone'] as const).some(k => form[k] !== profile[k])
  const reset = () => setForm({ email: profile.email, phone: profile.phone })
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
              <Field label={t('acct.nameTh')} hint={t('acct.fromProvider')}>
                <Input value={profile.name} readOnly />
              </Field>
              <Field label={t('acct.nameEn')} hint={t('acct.fromProvider')}>
                <Input value={profile.nameEn} readOnly />
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
        <PanelHead title={t('acct.linked')} sub={t('acct.linkedDesc')} />
        <div className="panel-body">
          <div className="acct-linked">
            {/* The artwork is a flat silhouette, so it is painted through a
                mask and takes the brand colour rather than sitting on a plate. */}
            <span className="acct-linked-logo" aria-hidden="true"
                  style={{ maskImage: `url(${asset('/img/provider-id.png')})`,
                           WebkitMaskImage: `url(${asset('/img/provider-id.png')})` }} />
            <div className="acct-linked-main">
              <b>{t('acct.linkedOk')} <Badge tone="green">{t('acct.active')}</Badge></b>
              <small>{t('acct.linkedNote')}</small>
            </div>
            <Button size="sm" onClick={() => toast(t('acct.openProviderHint'))}>
              {t('acct.openProvider')}
            </Button>
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
