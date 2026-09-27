import { LoginForm } from './login-form'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.cover}>
        <p className={styles.issue}>Nº 01 · Finanzas personales</p>
        <h1 className={styles.brand}>
          <em>Finanzas</em>
        </h1>
        <p className={styles.tagline}>
          Cuánto tienes.
          <br />
          En qué se va.
        </p>
      </section>
      <section className={styles.panel}>
        <LoginForm />
      </section>
    </main>
  )
}
