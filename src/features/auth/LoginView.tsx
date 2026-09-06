import { useState, type FormEvent } from 'react'
import { useStore } from '@/app/store'
import { useT } from '@/hooks/useT'
import { Button, Field, Input, Icon } from '@/components/ui'
import { ToastRegion } from '@/components/layout/ToastRegion'
import DotField from '@/components/DotField'
import { asset } from '@/lib/asset'
import './login.css'

/**
 * Sign-in screen. Left: brand and pitch over an interactive dot field.
 * Right: the credentials.
 */
export function LoginView() {
  const { t, lang } = useT()
  const signIn = useStore(s => s.signIn)
  const setLang = useStore(s => s.setLang)
  const toast = useStore(s => s.toast)

  /* ---- form ---- */
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!user.trim() || !pw || busy) return
    setBusy(true)
    /* A short beat so the button visibly acknowledges the press. */
    window.setTimeout(() => signIn(user.trim(), remember), 650)
  }

  return (
    <div className="login">
      <section className="login-show" aria-label={t('app.name')}>
        <div className="login-brand">
          <span className="login-brand-mark"><Icon name="box" size={22} /></span>
          <span>
            <b>{t('app.name')}</b>
            <small>{t('app.tagline')}</small>
          </span>
        </div>

        <div className="login-pitch">
          <h1 className="login-headline">{t('login.headline')}</h1>
          <p className="login-tagline">{t('login.tagline')}</p>
          {/* The modules, as quiet glass chips under the pitch. */}
          <ul className="login-modules" aria-hidden="true">
            {([
              ['document',        'nav.requisitions'],
              ['assessment',      'nav.review'],
              ['quick-box',       'nav.issue'],
              ['box-check',       'nav.receive'],
              ['boxes',           'nav.stock'],
              ['plug-connection', 'set.connector'],
            ] as const).map(([icon, key]) => (
              <li key={key}><i className={`fi fi-rr-${icon}`} /><span>{t(key)}</span></li>
            ))}
          </ul>
        </div>

        {/* Product artwork, centred inside two slow light rings. */}
        <div className="login-art" aria-hidden="true">
          <span className="login-art-ring" />
          <span className="login-art-ring login-art-ring--2" />
          <picture>
            <source srcSet={asset("/img/hero-1.webp")} type="image/webp" />
            <img src={asset("/img/hero-1.png")} alt="" className="is-on" />
          </picture>
        </div>

        {/* Interactive dot grid over the gradient; dots bulge away from the cursor. */}
        <DotField className="login-dotfield" aria-hidden="true"
                  dotRadius={1.6} dotSpacing={14} bulgeStrength={67} glowRadius={160}
                  gradientFrom="rgba(255,255,255,.34)" gradientTo="rgba(255,255,255,.10)"
                  glowColor="rgba(255,255,255,.22)" />
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="login-card-head">
            <span className="login-card-mark" aria-hidden="true"><Icon name="box" size={20} /></span>
            <em>{t('login.welcome')}</em>
            <b>{t('login.title')}</b>
            <small>{t('login.sub')}</small>
          </div>

          <Field label={t('login.username')} error={tried && !user.trim() ? t('login.required') : undefined}>
            <div className="login-input">
              <i className="fi fi-rr-user" aria-hidden="true" />
              <Input value={user} autoComplete="username" autoFocus
                     onChange={e => setUser(e.target.value)} />
            </div>
          </Field>
          <Field label={t('login.password')} error={tried && !pw ? t('login.required') : undefined}>
            <div className="login-input login-pw">
              <i className="fi fi-rr-lock" aria-hidden="true" />
              <Input type={show ? 'text' : 'password'} value={pw} autoComplete="current-password"
                     onChange={e => setPw(e.target.value)} />
              <button type="button" className="login-pw-eye" aria-label={t('login.showHide')}
                      aria-pressed={show} onClick={() => setShow(v => !v)}>
                <i className={`fi fi-rr-${show ? 'eye-crossed' : 'eye'}`} aria-hidden="true" />
              </button>
            </div>
          </Field>

          <div className="login-row">
            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>{t('login.remember')}</span>
            </label>
            <button type="button" className="linkbtn" onClick={() => toast(t('login.forgotHint'))}>
              {t('login.forgot')}
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" block disabled={busy}
                  iconRight={busy ? undefined : 'arrowR'}
                  className={`login-submit${busy ? ' login-busy' : ''}`}>
            {busy ? <><Icon name="refresh" /> {t('login.submit')}…</> : t('login.submit')}
          </Button>

          <p className="login-secure"><i className="fi fi-rr-shield-check" aria-hidden="true" /> {t('login.secure')}</p>
        </form>

        <footer className="login-foot">
          <span>{t('login.footer')}</span>
          <span className="login-lang" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === 'TH'} onClick={() => setLang('TH')}>ไทย</button>
            <button type="button" aria-pressed={lang === 'EN'} onClick={() => setLang('EN')}>EN</button>
          </span>
        </footer>
      </section>
      <ToastRegion />
    </div>
  )
}
