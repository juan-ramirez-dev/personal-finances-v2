import styles from '../login/login.module.css'
import { RegisterForm } from './register-form'

export default function RegisterPage() {
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
        <RegisterForm />
      </section>
    </main>
  )
}
