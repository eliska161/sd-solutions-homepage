import type { Metadata } from "next";
import { BATTERY_CALIBRATE_PUBLIC_PATH } from "@/lib/battery-calibrate";

export const metadata: Metadata = {
  title: "Batterikalibrering",
};

export default function BatteryCalibratePrintPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-black p-4 print:min-h-0 print:bg-white print:p-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BATTERY_CALIBRATE_PUBLIC_PATH}
        alt="Batterikalibrering. Lad til 100 %, la den stå i laderen i to timer, tøm batteriet helt, og lad til 100 % igjen."
        className="h-auto w-full max-w-[105mm] print:max-w-none print:w-[105mm]"
      />
      <p className="mt-4 text-center text-sm text-white print:hidden">
        Skriv ut og legg i konvolutten med telefonen.
      </p>
    </main>
  );
}
