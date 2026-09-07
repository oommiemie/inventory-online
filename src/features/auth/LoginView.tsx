import { useState } from 'react'
import { useStore } from '@/app/store'
import { useT } from '@/hooks/useT'
import { Button, Icon } from '@/components/ui'
import { ToastRegion } from '@/components/layout/ToastRegion'
import DotField from '@/components/DotField'
import { asset } from '@/lib/asset'
import './login.css'

/**
 * Sign-in screen. Left: brand and pitch over an interactive dot field.
 * Right: a single hand-off to Provider ID — the ministry's identity service
 * owns the credentials, so this app never sees a password.
 */
export function LoginView() {
  const { t, lang } = useT()
  const signIn = useStore(s => s.signIn)
  const setLang = useStore(s => s.setLang)
  const toast = useStore(s => s.toast)

  /* Prototype: the redirect to Provider ID is stood in for by a short beat,
     after which the session is treated as established. */
  const [busy, setBusy] = useState(false)
  const signInWithProvider = () => {
    if (busy) return
    setBusy(true)
    window.setTimeout(() => signIn('provider-id', true), 900)
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
        <div className="login-card">
          <div className="login-card-head">
            <span className="login-card-mark" aria-hidden="true"><Icon name="box" size={20} /></span>
            <em>{t('login.welcome')}</em>
            <b>{t('login.title')}</b>
            <small>{t('login.sub')}</small>
          </div>

          <Button variant="primary" size="lg" block disabled={busy}
                  onClick={signInWithProvider}
                  iconRight={busy ? undefined : 'arrowR'}
                  className={`login-submit${busy ? ' login-busy' : ''}`}>
            {busy
              ? <><Icon name="refresh" /> {t('login.connecting')}</>
              : t('login.submit')}
          </Button>

          <p className="login-provider-note">{t('login.providerNote')}</p>

          <button type="button" className="linkbtn login-help"
                  onClick={() => toast(t('login.providerHelpHint'))}>
            {t('login.providerHelp')}
          </button>

          <p className="login-secure"><i className="fi fi-rr-shield-check" aria-hidden="true" /> {t('login.secure')}</p>
        </div>

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
