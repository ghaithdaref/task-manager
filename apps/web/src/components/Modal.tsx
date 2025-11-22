import { ReactNode } from 'react'

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }
export default function Modal({ open, title, onClose, children, actions }: Props) {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', display:'grid', placeItems:'center', padding:20, zIndex:1200 }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ width:'min(540px, 100%)', maxWidth:'min(540px, 100%)', background:'var(--card)', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', border:'1px solid rgba(0,0,0,0.06)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:20, borderBottom:'1px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--text)' }}>
          <div style={{ fontWeight:600 }}>{title}</div>
          <button className="button button-ghost" onClick={onClose}>X</button>
        </div>
        <div style={{ padding:20, color:'var(--text)' }}>{children}</div>
        <div style={{ padding:20, display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
          {actions}
        </div>
      </div>
    </div>
  )
}