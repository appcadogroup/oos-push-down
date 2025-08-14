import React from "react";
import styles from "./switch.module.css";

const Switch = ({ checked, onChange, label }) => {
  return (
    <label className={styles.switchWrapper}>
      {label && <span className={styles.switchLabel}>{label}</span>}
      <div className={styles.switch}>
        <input
          type="checkbox"
          className={styles.switchInput}
          checked={checked}
          onChange={onChange}
        />
        <span className={styles.switchTrack}>
          <span className={styles.switchDot}></span>
        </span>
      </div>
    </label>
  );
};

export default Switch;