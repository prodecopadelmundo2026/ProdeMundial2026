import styles from './DailyVisualAtmosphere.module.css'

export function DailyVisualAtmosphere() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <span className={`${styles.shape} ${styles.yellow}`} />
      <span className={`${styles.shape} ${styles.orange}`} />
      <span className={`${styles.shape} ${styles.purple}`} />
      <span className={`${styles.shape} ${styles.mint}`} />
      <span className={styles.vignette} />
    </div>
  )
}
