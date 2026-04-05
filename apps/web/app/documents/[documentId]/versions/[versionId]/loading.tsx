import styles from "../../../../disclosure.module.css";

/** Shown while the server RSC payload streams — visible before client hydration. */
export default function VersionWorkspaceLoading() {
  return (
    <div
      className={styles.workspaceRouteLoadingBar}
      aria-busy="true"
      aria-label="Loading filing workspace"
    >
      <div className={styles.workspaceRouteLoadingBarFill} />
    </div>
  );
}
