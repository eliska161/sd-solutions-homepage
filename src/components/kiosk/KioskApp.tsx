"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PinPad } from "@/components/kiosk/PinPad";
import { KioskButton, KioskLogo, ScreenFrame } from "@/components/kiosk/ui";
import {
  CheckVisual,
  EnvelopeVisual,
  LabelVisual,
  LockerVisual,
  ParcelOutVisual,
} from "@/components/kiosk/visuals";
import {
  clockLabel,
  closeLocker,
  initialActivity,
  initialLockers,
  initialRepairs,
  MOCK_DEVICE,
  MOCK_LOCKER,
  MOCK_TICKET,
  nowTime,
  openLocker,
  printLabel,
  submitRating,
  verifyPin,
} from "@/lib/kiosk/mock";
import type {
  ActivityEvent,
  ErrorKind,
  KioskState,
  LockerBay,
} from "@/lib/kiosk/types";

type Model = {
  screen: KioskState;
  lockers: LockerBay[];
  activity: ActivityEvent[];
  rating: number;
  errorKind: ErrorKind;
  errorRetry: KioskState;
  demoFailNext: ErrorKind | null;
};

type Action =
  | { type: "GO"; screen: KioskState }
  | { type: "HOME" }
  | { type: "RESET" }
  | { type: "ERROR"; kind: ErrorKind; retry: KioskState }
  | { type: "CLEAR_ERROR" }
  | { type: "LOG"; message: string }
  | { type: "LOCKER"; id: number; status: LockerBay["status"] }
  | { type: "RATING"; value: number }
  | { type: "DEMO_FAIL"; kind: ErrorKind | null };

const initial: Model = {
  screen: "HOME",
  lockers: initialLockers,
  activity: initialActivity,
  rating: 0,
  errorKind: "generic",
  errorRetry: "HOME",
  demoFailNext: null,
};

function reducer(state: Model, action: Action): Model {
  switch (action.type) {
    case "GO":
      return { ...state, screen: action.screen };
    case "HOME":
      return { ...state, screen: "HOME", rating: 0 };
    case "RESET":
      return { ...initial };
    case "ERROR":
      return {
        ...state,
        screen: "ERROR",
        errorKind: action.kind,
        errorRetry: action.retry,
        demoFailNext: null,
      };
    case "CLEAR_ERROR":
      return { ...state, screen: state.errorRetry };
    case "LOG":
      return {
        ...state,
        activity: [
          { id: `${Date.now()}`, time: nowTime(), message: action.message },
          ...state.activity,
        ].slice(0, 8),
      };
    case "LOCKER":
      return {
        ...state,
        lockers: state.lockers.map((bay) =>
          bay.id === action.id ? { ...bay, status: action.status } : bay,
        ),
      };
    case "RATING":
      return { ...state, rating: action.value };
    case "DEMO_FAIL":
      return { ...state, demoFailNext: action.kind };
    default:
      return state;
  }
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export function KioskApp() {
  const [model, dispatch] = useReducer(reducer, initial);
  const [pin, setPin] = useState("");
  const [clock, setClock] = useState(clockLabel);
  const [busy, setBusy] = useState(false);
  const [envelopePacked, setEnvelopePacked] = useState(false);
  const [labelPrinted, setLabelPrinted] = useState(false);
  const [lockerOpen, setLockerOpen] = useState<number | null>(null);
  const [parcelOut, setParcelOut] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(clockLabel()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (model.screen === "ADMIN") return;
    if (model.screen === "HOME") return;
    const id = setTimeout(() => dispatch({ type: "HOME" }), 90_000);
    return () => clearTimeout(id);
  }, [model.screen]);

  useEffect(() => {
    if (model.screen !== "DELIVERY_SUCCESS" && model.screen !== "RATING_THANKS") {
      return;
    }
    const id = setTimeout(() => dispatch({ type: "HOME" }), 4200);
    return () => clearTimeout(id);
  }, [model.screen]);

  useEffect(() => {
    if (model.screen === "DELIVERY_ENVELOPE") setEnvelopePacked(true);
    if (model.screen === "HOME") {
      setEnvelopePacked(false);
      setLabelPrinted(false);
      setLockerOpen(null);
      setParcelOut(false);
      setPin("");
      setBusy(false);
    }
  }, [model.screen]);

  const occupied = useMemo(
    () =>
      model.lockers
        .filter((bay) => bay.status === "occupied")
        .map((bay) => bay.id),
    [model.lockers],
  );

  async function hardware<T extends { ok: boolean; reason?: ErrorKind }>(
    run: (fail: boolean) => Promise<T>,
    retry: KioskState,
  ) {
    if (model.demoFailNext === "network") {
      dispatch({ type: "ERROR", kind: "network", retry });
      return false;
    }
    setBusy(true);
    const fail =
      model.demoFailNext === "locker" || model.demoFailNext === "generic";
    const kind = model.demoFailNext;
    const result = await run(Boolean(fail));
    setBusy(false);
    if (!result.ok) {
      dispatch({
        type: "ERROR",
        kind: result.reason ?? kind ?? "generic",
        retry,
      });
      return false;
    }
    dispatch({ type: "DEMO_FAIL", kind: null });
    return true;
  }

  async function startPrint() {
    dispatch({ type: "GO", screen: "DELIVERY_LABEL" });
    setLabelPrinted(false);
    const ok = await hardware((fail) => printLabel(fail), "DELIVERY_ENVELOPE");
    if (ok) setLabelPrinted(true);
  }

  async function startOpen(next: KioskState, retry: KioskState) {
    dispatch({ type: "GO", screen: next === "DELIVERY_INSERT" ? "DELIVERY_OPEN_LOCKER" : "PICKUP_OPEN_LOCKER" });
    setLockerOpen(null);
    const ok = await hardware((fail) => openLocker(MOCK_LOCKER, fail), retry);
    if (!ok) return;
    setLockerOpen(MOCK_LOCKER);
    dispatch({ type: "LOCKER", id: MOCK_LOCKER, status: "open" });
    dispatch({ type: "LOG", message: `Locker ${MOCK_LOCKER} opened` });
    dispatch({ type: "GO", screen: next });
  }

  async function finishClose(next: KioskState, retry: KioskState, log: string) {
    const ok = await hardware((fail) => closeLocker(MOCK_LOCKER, fail), retry);
    if (!ok) return;
    setLockerOpen(null);
    dispatch({
      type: "LOCKER",
      id: MOCK_LOCKER,
      status: next === "DELIVERY_SUCCESS" ? "occupied" : "empty",
    });
    dispatch({ type: "LOG", message: log });
    dispatch({ type: "GO", screen: next });
  }

  function submitCustomerPin() {
    if (pin.length < 6) return;
    if (model.demoFailNext === "pin" || !verifyPin(pin, "customer")) {
      dispatch({ type: "ERROR", kind: "pin", retry: "PICKUP_PIN" });
      setPin("");
      return;
    }
    setPin("");
    dispatch({ type: "GO", screen: "PICKUP_FOUND" });
  }

  function submitAdminPin() {
    if (pin.length < 6) return;
    if (!verifyPin(pin, "admin")) {
      dispatch({ type: "ERROR", kind: "pin", retry: "ADMIN_PIN" });
      setPin("");
      return;
    }
    setPin("");
    dispatch({ type: "GO", screen: "ADMIN" });
  }

  useEffect(() => {
    if (pin.length !== 6) return;
    if (model.screen === "PICKUP_PIN") submitCustomerPin();
    if (model.screen === "ADMIN_PIN") submitAdminPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, model.screen]);

  async function adminOpen(id: 1 | 2 | 3 | 4) {
    const ok = await hardware((fail) => openLocker(id, fail), "ADMIN");
    if (!ok) return;
    setLockerOpen(id);
    dispatch({ type: "LOCKER", id, status: "open" });
    dispatch({ type: "LOG", message: `Locker ${id} opened` });
  }

  async function adminPrint() {
    await hardware((fail) => printLabel(fail), "ADMIN");
    dispatch({ type: "LOG", message: "Testetikett skrevet ut" });
  }

  const errorCopy: Record<ErrorKind, { title: string; body: string }> = {
    pin: {
      title: "Feil PIN",
      body: "Koden stemmer ikke. Prøv igjen.",
    },
    locker: {
      title: "Luke utilgjengelig",
      body: "Luken kan ikke åpnes akkurat nå.",
    },
    network: {
      title: "Ingen nettverk",
      body: "Kiosken når ikke tjenesten. Prøv igjen om et øyeblikk.",
    },
    generic: {
      title: "Noe gikk galt",
      body: "Handlingen ble ikke fullført.",
    },
  };

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-[#0c0e0d] text-white select-none [touch-action:manipulation]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(62,207,134,0.08),transparent_42%)]" />
      <div className="relative mx-auto flex h-full max-w-[1024px] flex-col">
        <header className="flex h-10 shrink-0 items-center justify-between px-6 text-[12px] text-white/40">
          <span>SD Solutions Locker</span>
          <span className="tabular-nums">{clock}</span>
        </header>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={model.screen}
              className="absolute inset-0"
              {...fade}
            >
              {model.screen === "HOME" ? (
                <div className="flex h-full flex-col items-center justify-center px-16 pb-6">
                  <KioskLogo onClick={() => dispatch({ type: "GO", screen: "ADMIN_PIN" })} />
                  <div className="mt-10 grid w-full max-w-[640px] gap-4">
                    <KioskButton
                      variant="home"
                      onClick={() =>
                        dispatch({ type: "GO", screen: "DELIVERY_ENVELOPE" })
                      }
                    >
                      LEVER INN ENHET
                    </KioskButton>
                    <KioskButton
                      variant="home"
                      onClick={() => dispatch({ type: "GO", screen: "PICKUP_PIN" })}
                    >
                      HENT ENHET
                    </KioskButton>
                  </div>
                </div>
              ) : null}

              {model.screen === "DELIVERY_ENVELOPE" ? (
                <ScreenFrame
                  progress={1}
                  onCancel={() => dispatch({ type: "HOME" })}
                >
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Lever inn enhet
                  </h1>
                  <p className="mt-1 text-[15px] text-white/55">
                    Vi guider deg gjennom innleveringen.
                  </p>
                  <div className="flex flex-1 items-center">
                    <EnvelopeVisual packed={envelopePacked} />
                  </div>
                  <p className="mb-4 text-center text-[17px]">
                    Legg enheten i en plastkonvolutt
                  </p>
                  <KioskButton onClick={startPrint}>Jeg har gjort dette</KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "DELIVERY_LABEL" ? (
                <ScreenFrame
                  progress={2}
                  onCancel={() => dispatch({ type: "HOME" })}
                >
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Fest etiketten
                  </h1>
                  <p className="mt-1 text-[15px] text-white/55">
                    Ta etiketten under og fest den på konvolutten
                  </p>
                  <div className="flex flex-1 items-center">
                    <LabelVisual printed={labelPrinted} />
                  </div>
                  <KioskButton
                    disabled={!labelPrinted || busy}
                    onClick={() => startOpen("DELIVERY_INSERT", "DELIVERY_LABEL")}
                  >
                    Etiketten er festet
                  </KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "DELIVERY_OPEN_LOCKER" ? (
                <ScreenFrame progress={3}>
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Åpner luke...
                  </h1>
                  <div className="flex flex-1 items-center">
                    <LockerVisual
                      openId={lockerOpen}
                      highlightId={MOCK_LOCKER}
                      occupied={occupied}
                    />
                  </div>
                </ScreenFrame>
              ) : null}

              {model.screen === "DELIVERY_INSERT" ? (
                <ScreenFrame
                  progress={3}
                  onCancel={() => dispatch({ type: "HOME" })}
                >
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Legg konvolutten i luke {MOCK_LOCKER}
                  </h1>
                  <div className="flex flex-1 items-center">
                    <LockerVisual
                      openId={lockerOpen}
                      highlightId={MOCK_LOCKER}
                      occupied={occupied.filter((id) => id !== MOCK_LOCKER)}
                    />
                  </div>
                  <KioskButton
                    onClick={() =>
                      dispatch({ type: "GO", screen: "DELIVERY_CLOSE_LOCKER" })
                    }
                  >
                    Jeg har lagt den inn
                  </KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "DELIVERY_CLOSE_LOCKER" ? (
                <CloseStep
                  progress={4}
                  occupied={occupied}
                  lockerOpen={lockerOpen}
                  onClose={() => {
                    setLockerOpen(null);
                    void finishClose(
                      "DELIVERY_SUCCESS",
                      "DELIVERY_CLOSE_LOCKER",
                      `Repair #${MOCK_TICKET} deposited`,
                    );
                  }}
                />
              ) : null}

              {model.screen === "DELIVERY_SUCCESS" ? (
                <ScreenFrame>
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <CheckVisual />
                    <h1 className="mt-5 text-[28px] font-medium tracking-[-0.03em]">
                      Enheten er mottatt
                    </h1>
                    <p className="mt-2 text-[16px] text-[#3ecf86]">
                      Reparasjon #{MOCK_TICKET}
                    </p>
                    <p className="mt-2 max-w-[36ch] text-[15px] text-white/55">
                      Du kan følge reparasjonen fra status-siden.
                    </p>
                  </div>
                  <KioskButton onClick={() => dispatch({ type: "HOME" })}>
                    Ferdig
                  </KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "PICKUP_PIN" ? (
                <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                  <div className="flex h-full flex-col items-center justify-center">
                    <h1 className="text-[28px] font-medium tracking-[-0.03em]">
                      Hent enheten din
                    </h1>
                    <p className="mt-1 mb-5 text-[15px] text-white/55">
                      Skriv inn PIN-koden du har fått.
                    </p>
                    <PinPad value={pin} onChange={setPin} />
                  </div>
                </ScreenFrame>
              ) : null}

              {model.screen === "PICKUP_FOUND" ? (
                <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Fant reparasjonen
                  </h1>
                  <div className="mx-auto mt-6 w-full max-w-[360px] rounded-2xl border border-white/10 bg-[#141816] p-5">
                    <p className="text-[11px] tracking-[0.16em] text-white/45">
                      SD SOLUTIONS
                    </p>
                    <p className="mt-2 text-[22px] font-medium">
                      REPARASJON #{MOCK_TICKET}
                    </p>
                    <p className="mt-1 text-[16px] text-white/70">{MOCK_DEVICE}</p>
                    <p className="mt-3 text-[13px] font-medium text-[#3ecf86]">
                      KLAR FOR HENTING
                    </p>
                  </div>
                  <div className="flex-1" />
                  <KioskButton
                    onClick={() => startOpen("PICKUP_RETRIEVE", "PICKUP_FOUND")}
                  >
                    Åpne luke
                  </KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "PICKUP_OPEN_LOCKER" ? (
                <ScreenFrame progress={3}>
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Åpner luke {MOCK_LOCKER}...
                  </h1>
                  <div className="flex flex-1 items-center">
                    <LockerVisual
                      openId={lockerOpen}
                      highlightId={MOCK_LOCKER}
                      occupied={occupied}
                    />
                  </div>
                </ScreenFrame>
              ) : null}

              {model.screen === "PICKUP_RETRIEVE" ? (
                <ScreenFrame progress={3}>
                  <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                    Ta ut enheten din
                  </h1>
                  <div className="flex flex-1 flex-col items-center justify-center gap-3">
                    <LockerVisual
                      openId={lockerOpen}
                      highlightId={MOCK_LOCKER}
                      occupied={occupied.filter((id) => id !== MOCK_LOCKER)}
                    />
                    <ParcelOutVisual visible={parcelOut || true} />
                  </div>
                  <KioskButton
                    onClick={() => {
                      setParcelOut(true);
                      dispatch({ type: "GO", screen: "PICKUP_CLOSE_LOCKER" });
                    }}
                  >
                    Jeg har hentet enheten
                  </KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "PICKUP_CLOSE_LOCKER" ? (
                <CloseStep
                  progress={4}
                  occupied={occupied.filter((id) => id !== MOCK_LOCKER)}
                  lockerOpen={lockerOpen}
                  onClose={() => {
                    setLockerOpen(null);
                    void finishClose(
                      "RATING",
                      "PICKUP_CLOSE_LOCKER",
                      `Locker ${MOCK_LOCKER} closed`,
                    );
                  }}
                />
              ) : null}

              {model.screen === "RATING" ? (
                <ScreenFrame>
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <h1 className="text-[28px] font-medium tracking-[-0.03em]">
                      Takk for besøket
                    </h1>
                    <p className="mt-2 text-[15px] text-white/55">
                      Hvordan var opplevelsen?
                    </p>
                    <div className="mt-8 flex gap-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} stjerner`}
                          onClick={() => {
                            dispatch({ type: "RATING", value: n });
                            void submitRating(n);
                            dispatch({ type: "GO", screen: "RATING_THANKS" });
                          }}
                          className="flex h-[64px] w-[64px] items-center justify-center rounded-2xl text-[#3ecf86] active:bg-white/[0.06]"
                        >
                          <svg viewBox="0 0 24 24" className="h-10 w-10">
                            <path
                              d="M12 3.2 14.6 8.8l6.2.9-4.5 4.4 1.1 6.2L12 17.4 6.6 20.3l1.1-6.2L3.2 9.7l6.2-.9L12 3.2z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </ScreenFrame>
              ) : null}

              {model.screen === "RATING_THANKS" ? (
                <ScreenFrame>
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <CheckVisual />
                    <h1 className="mt-5 text-[28px] font-medium tracking-[-0.03em]">
                      Takk for tilbakemeldingen
                    </h1>
                    <p className="mt-2 text-[22px] tracking-[0.2em] text-[#3ecf86]">
                      {"★".repeat(model.rating)}
                      <span className="text-white/20">
                        {"☆".repeat(Math.max(0, 5 - model.rating))}
                      </span>
                    </p>
                  </div>
                  <KioskButton onClick={() => dispatch({ type: "HOME" })}>
                    Ferdig
                  </KioskButton>
                </ScreenFrame>
              ) : null}

              {model.screen === "ADMIN_PIN" ? (
                <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                  <div className="flex h-full flex-col items-center justify-center">
                    <h1 className="text-[28px] font-medium tracking-[-0.03em]">
                      Administrasjon
                    </h1>
                    <p className="mt-1 mb-5 text-[15px] text-white/55">
                      Skriv inn admin-PIN.
                    </p>
                    <PinPad value={pin} onChange={setPin} />
                  </div>
                </ScreenFrame>
              ) : null}

              {model.screen === "ADMIN" ? (
                <AdminScreen
                  lockers={model.lockers}
                  activity={model.activity}
                  busy={busy}
                  lockerOpen={lockerOpen}
                  demoFailNext={model.demoFailNext}
                  onOpen={adminOpen}
                  onPrint={adminPrint}
                  onDemoFail={(kind) => dispatch({ type: "DEMO_FAIL", kind })}
                  onTestPin={() => {
                    setPin("");
                    dispatch({ type: "GO", screen: "PICKUP_PIN" });
                  }}
                  onReset={() => dispatch({ type: "RESET" })}
                  onBack={() => dispatch({ type: "HOME" })}
                />
              ) : null}

              {model.screen === "ERROR" ? (
                <ScreenFrame>
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <p className="text-[13px] tracking-[0.16em] text-white/40">
                      FEIL
                    </p>
                    <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
                      {errorCopy[model.errorKind].title}
                    </h1>
                    <p className="mt-2 max-w-[36ch] text-[15px] text-white/55">
                      {errorCopy[model.errorKind].body}
                    </p>
                  </div>
                  <KioskButton onClick={() => dispatch({ type: "CLEAR_ERROR" })}>
                    Prøv igjen
                  </KioskButton>
                </ScreenFrame>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CloseStep({
  progress,
  occupied,
  lockerOpen,
  onClose,
}: {
  progress: number;
  occupied: number[];
  lockerOpen: number | null;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setClosing(true);
  }, []);

  return (
    <ScreenFrame progress={progress}>
      <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em]">
        Lukk luken
      </h1>
      <div className="flex flex-1 items-center">
        <LockerVisual
          openId={closing ? null : lockerOpen}
          highlightId={MOCK_LOCKER}
          occupied={occupied}
        />
      </div>
      <KioskButton onClick={onClose}>Luken er lukket</KioskButton>
    </ScreenFrame>
  );
}

function AdminScreen({
  lockers,
  activity,
  busy,
  lockerOpen,
  demoFailNext,
  onOpen,
  onPrint,
  onDemoFail,
  onTestPin,
  onReset,
  onBack,
}: {
  lockers: LockerBay[];
  activity: ActivityEvent[];
  busy: boolean;
  lockerOpen: number | null;
  demoFailNext: ErrorKind | null;
  onOpen: (id: 1 | 2 | 3 | 4) => void;
  onPrint: () => void;
  onDemoFail: (kind: ErrorKind | null) => void;
  onTestPin: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-6 py-3">
      <div className="mb-3 flex items-center justify-between">
        <KioskLogo compact />
        <p className="text-[15px] text-white/50">Administrasjon</p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-4">
        <div>
          <p className="mb-2 text-[12px] tracking-[0.12em] text-white/40">LUKER</p>
          <div className="grid grid-cols-2 gap-2">
            {lockers.map((bay) => (
              <button
                key={bay.id}
                type="button"
                disabled={busy}
                onClick={() => onOpen(bay.id)}
                className="rounded-xl border border-white/10 bg-[#141816] px-3 py-3 text-left active:bg-[#1b211e]"
              >
                <p className="text-[13px] text-white/50">Luke {bay.id}</p>
                <p className="mt-1 text-[16px] font-medium">
                  {lockerOpen === bay.id
                    ? "Lås åpnet"
                    : bay.status === "occupied"
                      ? "Opptatt"
                      : "Ledig"}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniAction onClick={onPrint}>Test etikettprinter</MiniAction>
            <MiniAction onClick={onTestPin}>Test PIN</MiniAction>
          </div>
        </div>
        <div className="min-h-0 overflow-hidden">
          <p className="mb-2 text-[12px] tracking-[0.12em] text-white/40">
            AKTIVE SAKER
          </p>
          <ul className="space-y-1.5 text-[14px]">
            {initialRepairs.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 text-white/80">
                <span>
                  #{row.id} — {row.device}
                </span>
                <span className="text-white/45">{row.status}</span>
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-4 text-[12px] tracking-[0.12em] text-white/40">
            AKTIVITET
          </p>
          <ul className="space-y-1 text-[13px] text-white/55">
            {activity.map((row) => (
              <li key={row.id}>
                {row.time} — {row.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <DemoChip
          active={demoFailNext === "locker"}
          onClick={() => onDemoFail(demoFailNext === "locker" ? null : "locker")}
        >
          Luke opptatt
        </DemoChip>
        <DemoChip
          active={demoFailNext === "network"}
          onClick={() => onDemoFail(demoFailNext === "network" ? null : "network")}
        >
          Nettverk
        </DemoChip>
        <DemoChip
          active={demoFailNext === "generic"}
          onClick={() => onDemoFail(demoFailNext === "generic" ? null : "generic")}
        >
          Feil
        </DemoChip>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full px-3 py-2 text-[13px] text-white/45"
        >
          Tilbakestill
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onBack}
          className="h-12 min-w-[120px] rounded-xl bg-[#3ecf86] px-5 text-[15px] font-semibold text-[#0c0e0d]"
        >
          Tilbake
        </button>
      </div>
    </div>
  );
}

function MiniAction({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 rounded-xl border border-white/10 text-[13px] text-white/80 active:bg-white/[0.05]"
    >
      {children}
    </button>
  );
}

function DemoChip({
  children,
  active,
  onClick,
}: {
  children: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-2 text-[12px]",
        active ? "bg-[#3ecf86]/20 text-[#3ecf86]" : "text-white/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
