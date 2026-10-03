'use client'

import Link from 'next/link'
import reveal from '@/components/ui/reveal.module.css'
import { stagger } from '@/components/ui/reveal'
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
      <header className={reveal.reveal}>
        <p className={styles.eyebrow}>Ajustes</p>
        <h1 className={styles.title}>Tu cuenta</h1>
      </header>
      <div className={reveal.reveal} style={stagger(1)}>
        <RecoverySection userId={userId} email={email} />
      </div>
      <div className={reveal.reveal} style={stagger(2)}>
        <ChangePassword email={email} />
      </div>
      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
