'use client'

import { RecoveryCodes } from '@/components/ui/recovery-codes'
import styles from './auth-form.module.css'

interface CodesStepProps {
  codes: string[]
  onDone: () => void
}

// Se muestran una vez al salir del form. Después solo en Ajustes.
export function CodesStep({ codes, onDone }: CodesStepProps) {
  const single = codes.length === 1
  return (
    <div className={styles.form}>
      <div>
        <p className={styles.eyebrow}>Recuperación</p>
        <h2 className={styles.title}>
          {single ? 'Tu código nuevo' : 'Guarda tus códigos'}
        </h2>
      </div>
      <p className={styles.privacy}>
        {single
          ? 'El código que usaste ya no sirve. Este lo reemplaza. Guárdalo fuera de esta app; también lo ves en Ajustes.'
          : 'Si olvidas tu contraseña, cualquiera de estos códigos la cambia sin perder tus datos. Cada uno sirve una vez. Guárdalos fuera de esta app; también los ves en Ajustes.'}
      </p>
      <RecoveryCodes codes={codes} onDone={onDone} />
    </div>
  )
}
