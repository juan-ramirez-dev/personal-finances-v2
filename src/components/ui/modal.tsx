'use client'

import { useEffect, useRef } from 'react'
import styles from './modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: string
  children: React.ReactNode
  wide?: boolean
}

// <dialog> nativo: foco atrapado, Esc y fondo inerte sin librerías.
export function Modal({
  open,
  onClose,
  eyebrow,
  title,
  children,
  wide,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // autoFocus de React corre antes de abrir el dialog: se pierde.
      dialog.querySelector<HTMLElement>('input, select, textarea')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      onClose={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open && (
        <div className={styles.inner}>
          <header className={styles.header}>
            <div>
              {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
              <h2 className={styles.title}>{title}</h2>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  )
}
