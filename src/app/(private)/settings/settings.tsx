'use client'

import Link from 'next/link'
import { ChangePassword } from './change-password'
import { RecoverySection } from './recovery-section'
import styles from './settings.module.css'

interface SettingsProps {
  userId: string
  email: string
}

export function Settings({ userId, email }: SettingsProps) {
  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Ajustes</p>
        <h1 className={styles.title}>Tu cuenta</h1>
      </header>
      <RecoverySection userId={userId} email={email} />
      <ChangePassword email={email} />
      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
