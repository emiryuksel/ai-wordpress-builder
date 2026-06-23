import path from "node:path";

/** Kalıcı veri kökü (projects.json, users, runtime). */
export function getDataRoot(): string {
  const fromEnv = process.env.WP_DATA_ROOT?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return path.join(process.cwd(), "data");
}

/** WordPress Docker stack dosyaları (`docker-compose.yml`, wp-init). */
export function getRuntimeRoot(): string {
  return path.join(getDataRoot(), "runtime");
}
