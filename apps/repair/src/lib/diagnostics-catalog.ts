/**
 * Master diagnostics checklist for intake / repair / flip QA.
 * Keys are persisted on diagnostic_results.check_key.
 */
export const DIAGNOSTIC_CHECKS = [
  { key: "POWER", label: "Strøm / oppstart", group: "Core" },
  { key: "DISPLAY", label: "Skjerm / bilde", group: "Core" },
  { key: "TOUCH", label: "Touch", group: "Core" },
  { key: "FACE_ID", label: "Face ID / TrueDepth", group: "Biometrics" },
  { key: "TOUCH_ID", label: "Touch ID", group: "Biometrics" },
  { key: "FRONT_CAMERA", label: "Frontkamera", group: "Camera" },
  { key: "REAR_CAMERA", label: "Bakkamera", group: "Camera" },
  { key: "FLASH", label: "Blitz", group: "Camera" },
  { key: "SPEAKER", label: "Høyttaler", group: "Audio" },
  { key: "EARPIECE", label: "Ørehøyttaler", group: "Audio" },
  { key: "MICROPHONE", label: "Mikrofon", group: "Audio" },
  { key: "CELLULAR", label: "Mobilnett / IMEI", group: "Connectivity" },
  { key: "WIFI", label: "Wi-Fi", group: "Connectivity" },
  { key: "BLUETOOTH", label: "Bluetooth", group: "Connectivity" },
  { key: "GPS", label: "GPS / lokasjon", group: "Connectivity" },
  { key: "BATTERY", label: "Batteri / helse", group: "Power" },
  { key: "CHARGING", label: "Lading", group: "Power" },
  { key: "BUTTONS", label: "Knapper / brytere", group: "Hardware" },
  { key: "HAPTICS", label: "Taptic Engine", group: "Hardware" },
  { key: "SENSORS", label: "Sensorer (nærhet, gyro)", group: "Hardware" },
  { key: "HOUSING", label: "Kabinet / skader", group: "Physical" },
  { key: "PORTS", label: "Porter / kontakter", group: "Physical" },
  { key: "WATER_DAMAGE", label: "Vannskade-indikator", group: "Physical" },
  { key: "ACTIVATION_LOCK", label: "Activation Lock / Find My", group: "Software" },
  { key: "SOFTWARE", label: "Programvare / iOS", group: "Software" },
] as const;

export type DiagnosticCheckKey = (typeof DIAGNOSTIC_CHECKS)[number]["key"];

export function isDiagnosticCheckKey(value: string): value is DiagnosticCheckKey {
  return DIAGNOSTIC_CHECKS.some((c) => c.key === value);
}
