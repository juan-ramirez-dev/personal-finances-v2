import type { ButtonHTMLAttributes } from 'react'
import styles from './button.module.css'

type Variant = 'ink' | 'outline' | 'link'

export function Button({
  className,
  variant = 'ink',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')
  return <button className={classes} {...props} />
}
