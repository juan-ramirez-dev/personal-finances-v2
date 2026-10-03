import { ViewTransition } from 'react'
import { Wordmark } from '@/components/ui/wordmark'
import reveal from '@/components/ui/reveal.module.css'
import { stagger } from '@/components/ui/reveal'
import styles from './auth-layout.module.css'

const PROMISES = [
  ['Cifrado', 'De extremo a extremo'],
  ['Sesión', 'Vence a las 2 horas'],
  ['Recuperación', 'Códigos de un solo uso'],
]

// La portada vive aquí para no re-animarse al pasar entre login, registro y recuperar.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.top}>
          <Wordmark size="sm" />
          <span className={styles.kicker}>Finanzas personales</span>
        </header>
        <hr className={`${reveal.rule} ${styles.rule}`} />
        <div className={styles.slot}>
          <ViewTransition>
            <div className={`${reveal.reveal} ${styles.content}`}>
              {children}
            </div>
          </ViewTransition>
        </div>
        <footer className={styles.foot}>© Lucka</footer>
      </main>

      <aside className={styles.cover}>
        <p className={`${reveal.reveal} ${styles.quote}`} style={stagger(2)}>
          Tu dinero, en orden y <em>solo para tus ojos.</em>
        </p>
        <dl className={styles.promises}>
          {PROMISES.map(([term, detail], i) => (
            <div key={term} className={reveal.reveal} style={stagger(i + 4)}>
              <dt>{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  )
}
