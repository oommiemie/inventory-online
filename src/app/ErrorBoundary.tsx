import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Last line of defence: a render error anywhere below shows a recovery card
 * instead of a blank page. Saved state is a likely culprit after an upgrade,
 * so clearing it is offered alongside a plain reload.
 *
 * Class component because React exposes error catching only through the
 * lifecycle methods, which hooks do not cover.
 */
interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept on the console so a developer sees the component stack in dev tools.
    console.error('Unhandled render error', error, info.componentStack)
  }

  private reload = () => window.location.reload()

  private resetAndReload = () => {
    try {
      localStorage.removeItem('io.state')
    } catch {
      /* private mode or blocked storage — a plain reload is still worth trying */
    }
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash">
        <div className="crash-card" role="alert">
          <span className="crash-mark" aria-hidden="true">
            <i className="fi fi-rr-triangle-warning" />
          </span>
          <b>เกิดข้อผิดพลาดในการแสดงผล</b>
          <p>
            ระบบหยุดทำงานชั่วคราว ลองโหลดหน้าใหม่อีกครั้ง
            หากยังไม่หาย ให้ล้างข้อมูลที่บันทึกไว้ในเครื่องแล้วเริ่มจากข้อมูลตัวอย่าง
          </p>
          <pre>{error.message}</pre>
          <div className="crash-actions">
            <button type="button" className="btn" onClick={this.resetAndReload}>
              ล้างข้อมูลแล้วเริ่มใหม่
            </button>
            <button type="button" className="btn btn-primary" onClick={this.reload}>
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      </div>
    )
  }
}
