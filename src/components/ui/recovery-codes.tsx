'use client'

import { useState } from 'react'
import { Button } from './button'
import reveal from './reveal.module.css'
import { stagger } from './reveal'
import styles from './recovery-codes.module.css'

interface RecoveryCodesProps {
  codes: string[]
  // Con onDone pide confirmar que los guardó antes de seguir.
  onDone?: () => void
}

export function RecoveryCodes({ codes, onDone }: RecoveryCodesProps) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = codes.join('\n')

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([`Códigos de recuperación · Lucka\n\n${text}\n`], {
        type: 'text/plain',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'lucka-codigos-recuperacion.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <ul className={styles.codes}>
        {codes.map((code, i) => (
          <li key={code} className={reveal.reveal} style={stagger(i)}>
            {code}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? 'Copiados' : 'Copiar'}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          Descargar
        </Button>
      </div>
      {onDone && (
        <>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={saved}
              onChange={e => setSaved(e.target.checked)}
            />
            Ya los guardé en un lugar seguro
          </label>
          <Button type="button" disabled={!saved} onClick={onDone}>
            Continuar
          </Button>
        </>
      )}
    </>
  )
}
