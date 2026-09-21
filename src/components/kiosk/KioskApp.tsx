"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PinPad } from "@/components/kiosk/PinPad";
import { IdentifierPad } from "@/components/kiosk/IdentifierPad";
import { KioskSignaturePad } from "@/components/kiosk/KioskSignaturePad";
import { ChoiceGrid, CommentList, KioskButton, KioskLogo, ScreenFrame } from "@/components/kiosk/ui";
import {
  CheckVisual,
  EnvelopeVisual,
  LabelVisual,
  LockerVisual,
} from "@/components/kiosk/visuals";
import {
  createLiveLockerOrder,
  fetchKioskBoard,
  lookupLiveDevice,
  lookupLiveDropoffs,
  lookupLivePickup,
  receiveLiveTicket,
} from "@/lib/kiosk/client";
import {
  clockLabel,
  closeLocker,
  createKioskServiceOrder,
  initialActivity,
  initialLockers,
  initialRepairs,
  KIOSK_COMMENTS,
  KIOSK_DEVICES,
  KIOSK_ISSUES,
  MOCK_DEVICE,
  MOCK_LOCKER,
  MOCK_PHONE,
  MOCK_TICKET,
  nowTime,
  formatNoMobile,
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
  RepairRow,
} from "@/lib/kiosk/types";
import { classifyKioskQuery, compactKioskId, splitImeiAndSerial } from "@/lib/kiosk/query";
import { LEGAL_VERSION, fysiskReparasjonsvilkar } from "@/lib/legal";

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
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
};

export function KioskApp() {
  const [model, dispatch] = useReducer(reducer, initial);
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [clock, setClock] = useState("");
  const [busy, setBusy] = useState(false);
  const [labelPrinted, setLabelPrinted] = useState(false);
  const [lockerOpen, setLockerOpen] = useState<number | null>(null);
  const [matches, setMatches] = useState<RepairRow[]>([]);
  const [selected, setSelected] = useState<RepairRow | null>(null);
  const [draftDevice, setDraftDevice] = useState("");
  const [draftIssue, setDraftIssue] = useState("");
  const [draftComment, setDraftComment] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [deviceNote, setDeviceNote] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signaturePng, setSignaturePng] = useState<string | null>(null);
  const [liveTickets, setLiveTickets] = useState<RepairRow[]>([]);
  const lookupGen = useRef(0);
  const lastLookup = useRef("");

  const ticket = selected?.id ?? MOCK_TICKET;
  const device = selected?.device ?? MOCK_DEVICE;
  const issue = selected?.issue ?? "";
  const stickerPhone = selected?.phone ?? (phone || MOCK_PHONE);
  const stickerPhoneLabel = formatNoMobile(stickerPhone);
  const stickerParts = selected?.parts ?? [];

  useEffect(() => {
    setClock(clockLabel());
    const id = setInterval(() => setClock(clockLabel()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (model.screen === "ADMIN" || model.screen === "ADMIN_PIN") return;
    if (model.screen === "HOME") return;
    const reading =
      model.screen === "DELIVERY_NEW_TERMS" || model.screen === "DELIVERY_NEW_SIGN";
    const id = setTimeout(() => dispatch({ type: "HOME" }), reading ? 180_000 : 90_000);
    return () => clearTimeout(id);
  }, [model.screen, pin, phone, deviceCode, draftComment, termsAccepted, signaturePng]);

  useEffect(() => {
    if (model.screen !== "DELIVERY_SUCCESS" && model.screen !== "RATING_THANKS") {
      return;
    }
    const id = setTimeout(() => dispatch({ type: "HOME" }), 4200);
    return () => clearTimeout(id);
  }, [model.screen]);

  useEffect(() => {
    if (model.screen === "HOME") {
      setLabelPrinted(false);
      setLockerOpen(null);
      setPin("");
      setPhone("");
      setMatches([]);
      setSelected(null);
      setDraftDevice("");
      setDraftIssue("");
      setDraftComment("");
      setDeviceCode("");
      setDeviceNote("");
      setTermsAccepted(false);
      setSignaturePng(null);
      lastLookup.current = "";
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
    const ok = await hardware(
      (fail) =>
        printLabel(
          {
            ticket,
            device,
            phone: stickerPhone,
            issue,
            parts: stickerParts,
            locker: MOCK_LOCKER,
          },
          fail,
        ),
      "DELIVERY_ENVELOPE",
    );
    if (ok) setLabelPrinted(true);
  }

  async function startOpen(next: KioskState, retry: KioskState) {
    dispatch({
      type: "GO",
      screen: next === "DELIVERY_INSERT" ? "DELIVERY_OPEN_LOCKER" : "PICKUP_OPEN_LOCKER",
    });
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
    if (next === "DELIVERY_SUCCESS") {
      void receiveLiveTicket(ticket);
    }
    dispatch({ type: "GO", screen: next });
  }

  async function submitCustomerPin() {
    if (pin.length < 6) return;
    if (model.demoFailNext === "pin") {
      dispatch({ type: "ERROR", kind: "pin", retry: "PICKUP_PIN" });
      setPin("");
      return;
    }
    if (model.demoFailNext === "network") {
      dispatch({ type: "ERROR", kind: "network", retry: "PICKUP_PIN" });
      return;
    }
    setBusy(true);
    const live = await lookupLivePickup(pin);
    setBusy(false);
    if (live.ok) {
      setSelected(live.repair);
      setPin("");
      dispatch({ type: "GO", screen: "PICKUP_FOUND" });
      return;
    }
    if (!live.notfound && verifyPin(pin, "customer")) {
      setSelected(initialRepairs[0] ?? null);
      setPin("");
      dispatch({ type: "GO", screen: "PICKUP_FOUND" });
      return;
    }
    dispatch({ type: "ERROR", kind: "pin", retry: "PICKUP_PIN" });
    setPin("");
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

  async function lookupQuery(opts?: { silent?: boolean; query?: string }) {
    const q = (opts?.query ?? lastLookup.current).trim();
    const kind = classifyKioskQuery(q);
    if (kind === "empty") return;
    if (model.demoFailNext === "network") {
      if (!opts?.silent) {
        dispatch({
          type: "ERROR",
          kind: "network",
          retry: model.screen === "DELIVERY_CODE" ? "DELIVERY_CODE" : "DELIVERY_PHONE",
        });
      }
      return;
    }
    const gen = ++lookupGen.current;
    if (!opts?.silent) setBusy(true);
    lastLookup.current = q;
    const result = await lookupLiveDropoffs(q);
    if (!result.ok) {
      if (!opts?.silent) setBusy(false);
      if (gen !== lookupGen.current) return;
      if (!opts?.silent) {
        dispatch({
          type: "ERROR",
          kind: "network",
          retry: model.screen === "DELIVERY_CODE" ? "DELIVERY_CODE" : "DELIVERY_PHONE",
        });
      }
      return;
    }
    if (gen !== lookupGen.current) {
      if (!opts?.silent) setBusy(false);
      return;
    }
    if (!opts?.silent) setBusy(false);
    setMatches(result.repairs);
    const next: KioskState = result.repairs.length
      ? "DELIVERY_SELECT"
      : "DELIVERY_EMPTY";
    if (
      model.screen === "DELIVERY_PHONE" ||
      model.screen === "DELIVERY_CODE" ||
      model.screen !== next
    ) {
      dispatch({ type: "GO", screen: next });
    }
  }

  function startNewOrder() {
    lookupGen.current += 1;
    setBusy(false);
    setDraftIssue("");
    setDraftComment("");
    setDeviceNote("");
    setTermsAccepted(false);
    setSignaturePng(null);
    dispatch({ type: "GO", screen: "DELIVERY_NEW_ID" });
  }

  async function lookupDeviceModel() {
    const q = deviceCode.trim();
    if (compactKioskId(q).length < 8) return;
    setBusy(true);
    const result = await lookupLiveDevice(q);
    setBusy(false);
    if (!result.ok) {
      setDeviceNote("Fant ikke modell. Fyll inn manuelt.");
      return;
    }
    setDeviceNote(result.note);
    if (result.model) setDraftDevice(result.model);
    const ids = splitImeiAndSerial(q);
    if (result.imei && !ids.serialNumber) setDeviceCode(result.imei);
  }

  function goToIssueOrManual() {
    if (draftDevice.trim().length >= 2) {
      dispatch({ type: "GO", screen: "DELIVERY_NEW_ISSUE" });
      return;
    }
    dispatch({ type: "GO", screen: "DELIVERY_NEW_DEVICE" });
  }

  async function finishNewOrder(commentOverride?: string) {
    if (draftDevice.trim().length < 2 || draftIssue.trim().length < 2) {
      dispatch({ type: "ERROR", kind: "generic", retry: "DELIVERY_NEW_ISSUE" });
      return;
    }
    const ids = splitImeiAndSerial(deviceCode);
    if (!ids.imei && !ids.serialNumber) {
      dispatch({ type: "ERROR", kind: "generic", retry: "DELIVERY_NEW_ID" });
      return;
    }
    const comment = (commentOverride !== undefined ? commentOverride : draftComment).trim();
    if (commentOverride !== undefined) setDraftComment(comment);
    if (phone.length < 8) {
      dispatch({ type: "GO", screen: "DELIVERY_NEW_PHONE" });
      return;
    }
    if (!termsAccepted) {
      dispatch({ type: "GO", screen: "DELIVERY_NEW_TERMS" });
      return;
    }
    if (!signaturePng) {
      dispatch({ type: "GO", screen: "DELIVERY_NEW_SIGN" });
      return;
    }
    setBusy(true);
    const payload = {
      phone,
      device: draftDevice,
      issue: draftIssue,
      comment,
      imei: ids.imei || "",
      serialNumber: ids.serialNumber || "",
      termsAccepted: true,
      termsVersion: LEGAL_VERSION,
      signaturePng,
      termsSignerName: "Kunde",
    };
    const live = await createLiveLockerOrder(payload);
    const result = live.ok ? live : await createKioskServiceOrder(payload);
    setBusy(false);
    if (!result.ok) {
      dispatch({ type: "ERROR", kind: "generic", retry: "DELIVERY_NEW_SIGN" });
      return;
    }
    setSelected(result.repair);
    dispatch({ type: "GO", screen: "DELIVERY_ENVELOPE" });
  }

  useEffect(() => {
    if (model.screen === "DELIVERY_PHONE" && phone.length === 8) {
      void lookupQuery({ query: phone });
    }
    if (model.screen === "DELIVERY_CODE" && classifyKioskQuery(deviceCode) === "imei") {
      void lookupQuery({ query: deviceCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, deviceCode, model.screen]);

  useEffect(() => {
    if (model.screen !== "DELIVERY_NEW_ID") return;
    if (classifyKioskQuery(deviceCode) === "imei") void lookupDeviceModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceCode, model.screen]);

  useEffect(() => {
    if (model.screen === "DELIVERY_NEW_PHONE" && phone.length === 8) {
      void finishNewOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, model.screen]);

  useEffect(() => {
    const liveScreens =
      model.screen === "DELIVERY_SELECT" ||
      model.screen === "DELIVERY_EMPTY" ||
      model.screen === "ADMIN";
    if (!liveScreens) return;
    const tick = () => {
      if (model.screen === "ADMIN") {
        void fetchKioskBoard().then((board) =>
          setLiveTickets([...board.dropoffs, ...board.pickups]),
        );
        return;
      }
      if (lastLookup.current) void lookupQuery({ silent: true, query: lastLookup.current });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.screen, phone, deviceCode]);

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

  async function adminConnectSerial() {
    try {
      const { connectSerialPrinter, printerLinkLabel } = await import("@/lib/kiosk/usb-printer");
      await connectSerialPrinter();
      dispatch({ type: "LOG", message: `Skriver: ${printerLinkLabel()}. Velg OTID TM#3.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "TTY-skriveren svarte ikke";
      dispatch({ type: "LOG", message });
    }
  }

  async function adminConnectUsb() {
    try {
      const { connectUsbPrinter, printerLinkLabel } = await import("@/lib/kiosk/usb-printer");
      await connectUsbPrinter();
      dispatch({ type: "LOG", message: `Skriver: ${printerLinkLabel()}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "USB-skriveren er opptatt";
      dispatch({ type: "LOG", message });
    }
  }

  async function adminSetBaud(baud: number) {
    try {
      const { setSerialBaud, printerLinkLabel } = await import("@/lib/kiosk/usb-printer");
      await setSerialBaud(baud);
      dispatch({ type: "LOG", message: `Skriver: ${printerLinkLabel()}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunne ikke sette baud";
      dispatch({ type: "LOG", message });
    }
  }

  async function adminPrint() {
    setBusy(true);
    const result = await printLabel({
      ticket: MOCK_TICKET,
      device: MOCK_DEVICE,
      phone: MOCK_PHONE,
      issue: "Skjerm",
      parts: ["Skjerm (Aftermarket)", "Batteri (OEM Pull)"],
      locker: MOCK_LOCKER,
    });
    setBusy(false);
    if (result.ok) {
      dispatch({ type: "LOG", message: "Testetikett sendt til skriveren" });
      return;
    }
    dispatch({ type: "LOG", message: "Utskrift feilet. Prøv TTY 9600 på OTID TM#3." });
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
    notfound: {
      title: "Ingen treff",
      body: "Vi fant ingen innleveringer på dette nummeret.",
    },
    printer: {
      title: "Skriveren svarer ikke",
      body: "Velg TTY-enheten OTID TM#3, ikke POS-skriveren kiosk-OS allerede bruker. Baud 9600 først, deretter 19200.",
    },
  };

  return (
    <div className="relative flex h-[100dvh] w-[100dvw] flex-col overflow-hidden bg-[#e8eaee] text-[#1f2430] select-none [touch-action:manipulation]">
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#1b1e24] px-5 text-white">
        <KioskLogo
          onClick={() => dispatch({ type: "GO", screen: "ADMIN_PIN" })}
        />
        <p className="text-[15px] font-semibold tabular-nums" suppressHydrationWarning>
          {clock}
        </p>
      </header>

      <div className="relative mx-auto min-h-0 w-full max-w-[1024px] flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={model.screen}
            className="absolute inset-0"
            {...fade}
          >
            {model.screen === "HOME" ? (
              <div className="flex h-full flex-col items-center justify-center px-10 pb-8">
                <h1 className="mb-8 text-center text-[40px] font-bold tracking-tight">
                  Hva vil du gjøre?
                </h1>
                <div className="grid w-full max-w-[680px] gap-4">
                  <KioskButton
                    variant="home"
                    onClick={() =>
                      dispatch({ type: "GO", screen: "DELIVERY_PHONE" })
                    }
                  >
                    Lever inn enhet
                  </KioskButton>
                  <KioskButton
                    variant="homeAlt"
                    onClick={() => dispatch({ type: "GO", screen: "PICKUP_PIN" })}
                  >
                    Hent enhet
                  </KioskButton>
                </div>
              </div>
            ) : null}

            {model.screen === "DELIVERY_PHONE" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <div className="flex h-full flex-col items-center justify-center">
                  <h1 className="text-[34px] font-bold tracking-tight">
                    Finn saken
                  </h1>
                  <p className="mt-2 mb-5 text-center text-[22px] font-semibold text-[#3d4454]">
                    Skriv telefonnummeret saken er registrert på.
                  </p>
                  <PinPad
                    mode="phone"
                    length={8}
                    value={phone}
                    onChange={setPhone}
                    disabled={busy}
                  />
                  <div className="mt-5 grid w-full max-w-[340px] gap-2">
                    <KioskButton
                      variant="ghost"
                      disabled={busy}
                      onClick={() => dispatch({ type: "GO", screen: "DELIVERY_CODE" })}
                    >
                      IMEI / serienummer
                    </KioskButton>
                    <KioskButton variant="ghost" disabled={busy} onClick={startNewOrder}>
                      Ny serviceordre
                    </KioskButton>
                  </div>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_CODE" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-1 text-[30px] font-bold tracking-tight">
                  IMEI eller serienummer
                </h1>
                <p className="mt-1 mb-2 text-center text-[20px] font-semibold text-[#3d4454]">
                  Brukes hvis du ikke har telefonnummeret.
                </p>
                <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto">
                  <IdentifierPad
                    value={deviceCode}
                    onChange={setDeviceCode}
                    disabled={busy}
                  />
                </div>
                <div className="mt-2 grid gap-2">
                  <KioskButton
                    disabled={compactKioskId(deviceCode).length < 8 || busy}
                    onClick={() => void lookupQuery({ query: deviceCode })}
                  >
                    Søk
                  </KioskButton>
                  <KioskButton
                    variant="ghost"
                    onClick={() => dispatch({ type: "GO", screen: "DELIVERY_PHONE" })}
                  >
                    Bruk telefonnummer
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_SELECT" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Velg reparasjon
                </h1>
                <p className="mt-1 mb-4 text-[22px] font-semibold text-[#3d4454]">
                  Trykk på saken du skal levere inn.
                </p>
                <div className="grid min-h-0 flex-1 content-start gap-3 overflow-auto">
                  {matches.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setSelected(row);
                        dispatch({ type: "GO", screen: "DELIVERY_ENVELOPE" });
                      }}
                      className="w-full border-[3px] border-[#1f2430] bg-white px-5 py-4 text-left active:bg-[#d5d8de] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
                    >
                      <p className="text-[26px] font-bold">Reparasjon #{row.id}</p>
                      <p className="mt-1 text-[22px] font-semibold">{row.device}</p>
                      {row.issue ? (
                        <p className="text-[18px] font-semibold text-[#3d4454]">{row.issue}</p>
                      ) : null}
                      <p className="mt-1 text-[18px] font-bold text-[#2b6cb0]">
                        {row.status}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <KioskButton variant="ghost" onClick={startNewOrder}>
                    Opprett ny serviceordre
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_EMPTY" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <h1 className="text-[34px] font-bold tracking-tight">
                    Ingen treff
                  </h1>
                  <p className="mt-3 max-w-[28ch] text-[24px] font-semibold text-[#3d4454]">
                    Ingen innlevering på dette. Du kan opprette en serviceordre her.
                  </p>
                </div>
                <KioskButton onClick={startNewOrder}>
                  Opprett serviceordre
                </KioskButton>
                <div className="mt-3">
                  <KioskButton
                    variant="ghost"
                    onClick={() => {
                      setPhone("");
                      setDeviceCode("");
                      dispatch({ type: "GO", screen: "DELIVERY_PHONE" });
                    }}
                  >
                    Prøv på nytt
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_ID" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-1 text-[30px] font-bold tracking-tight">
                  IMEI eller serienummer
                </h1>
                <p className="mt-1 mb-2 text-[20px] font-semibold text-[#3d4454]">
                  Vi henter modellen hvis nummeret er kjent.
                </p>
                <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto">
                  <IdentifierPad
                    value={deviceCode}
                    onChange={setDeviceCode}
                    disabled={busy}
                  />
                  {deviceNote ? (
                    <p className="mt-2 text-center text-[20px] font-bold">{deviceNote}</p>
                  ) : null}
                  {draftDevice ? (
                    <p className="mt-1 text-center text-[24px] font-bold text-[#2b6cb0]">
                      {draftDevice}
                    </p>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2">
                  <KioskButton
                    disabled={compactKioskId(deviceCode).length < 8 || busy}
                    onClick={() => void lookupDeviceModel()}
                  >
                    Hent modell
                  </KioskButton>
                  <KioskButton
                    variant="ghost"
                    disabled={compactKioskId(deviceCode).length < 8 || busy}
                    onClick={goToIssueOrManual}
                  >
                    {draftDevice ? "Fortsett" : "Fyll inn modell manuelt"}
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_DEVICE" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Velg modell
                </h1>
                <p className="mt-1 mb-3 text-[22px] font-semibold text-[#3d4454]">
                  Hva skal leveres inn?
                </p>
                <ChoiceGrid
                  options={KIOSK_DEVICES}
                  onPick={(value) => {
                    setDraftDevice(value);
                    dispatch({ type: "GO", screen: "DELIVERY_NEW_ISSUE" });
                  }}
                />
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_ISSUE" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Hva er galt?
                </h1>
                <p className="mt-1 mb-3 text-[22px] font-semibold text-[#3d4454]">
                  {draftDevice}
                </p>
                <ChoiceGrid
                  options={KIOSK_ISSUES}
                  onPick={(value) => {
                    setDraftIssue(value);
                    dispatch({ type: "GO", screen: "DELIVERY_NEW_COMMENT" });
                  }}
                />
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_COMMENT" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Merknad
                </h1>
                <p className="mt-1 mb-4 text-[22px] font-semibold text-[#3d4454]">
                  Valgfritt. Trykk én, eller hopp over.
                </p>
                <CommentList
                  options={KIOSK_COMMENTS}
                  onPick={(value) => {
                    setDraftComment(value);
                    dispatch({ type: "GO", screen: "DELIVERY_NEW_TERMS" });
                  }}
                />
                <div className="mt-3">
                  <KioskButton
                    variant="ghost"
                    onClick={() => {
                      setDraftComment("");
                      dispatch({ type: "GO", screen: "DELIVERY_NEW_TERMS" });
                    }}
                  >
                    Hopp over
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_TERMS" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="text-[30px] font-bold tracking-tight">
                  Les og godta vilkår
                </h1>
                <p className="mt-1 mb-2 text-[18px] font-semibold text-[#3d4454]">
                  Scroll gjennom, og bekreft nederst.
                </p>
                <div className="min-h-0 flex-1 overflow-auto border-[3px] border-[#1f2430] bg-white p-4 text-[18px] leading-snug">
                  {fysiskReparasjonsvilkar.sections.map((section) => (
                    <p key={section.title} className="mb-3">
                      <span className="font-bold">{section.title}. </span>
                      {section.paragraphs.join(" ")}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTermsAccepted((value) => !value)}
                  className="mt-3 flex w-full items-center gap-3 border-[3px] border-[#1f2430] bg-white px-4 py-4 text-left text-[20px] font-bold"
                >
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[#1f2430]",
                      termsAccepted ? "bg-[#2f855a] text-white" : "bg-white",
                    ].join(" ")}
                    aria-hidden
                  >
                    {termsAccepted ? "✓" : ""}
                  </span>
                  Jeg har lest vilkårene og godtar dem.
                </button>
                <div className="mt-3">
                  <KioskButton
                    disabled={!termsAccepted}
                    onClick={() => dispatch({ type: "GO", screen: "DELIVERY_NEW_SIGN" })}
                  >
                    Fortsett til signering
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_SIGN" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="text-[30px] font-bold tracking-tight">
                  Signer på skjermen
                </h1>
                <p className="mt-1 mb-3 text-[20px] font-semibold text-[#3d4454]">
                  Skriv med fingeren. Uten signatur opprettes ikke ordren.
                </p>
                <div className="min-h-0 flex-1">
                  <KioskSignaturePad onChange={setSignaturePng} />
                </div>
                <div className="mt-3">
                  <KioskButton
                    disabled={!signaturePng || busy}
                    onClick={() => void finishNewOrder()}
                  >
                    Signer og opprett
                  </KioskButton>
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_NEW_PHONE" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <div className="flex h-full flex-col items-center justify-center">
                  <h1 className="text-[32px] font-bold tracking-tight">
                    Telefonnummer
                  </h1>
                  <p className="mt-2 mb-5 text-center text-[22px] font-semibold text-[#3d4454]">
                    Vi bruker nummeret til statusvarsler.
                  </p>
                  <PinPad
                    mode="phone"
                    length={8}
                    value={phone}
                    onChange={setPhone}
                    disabled={busy}
                  />
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "DELIVERY_ENVELOPE" ? (
              <ScreenFrame
                progress={1}
                onCancel={() => dispatch({ type: "HOME" })}
              >
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Lever inn enhet
                </h1>
                <div className="flex flex-1 items-center">
                  <EnvelopeVisual />
                </div>
                <p className="mb-4 text-center text-[32px] font-bold leading-tight">
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
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Fest etiketten
                </h1>
                <div className="flex flex-1 items-center">
                  <LabelVisual
                    printed={labelPrinted}
                    ticket={ticket}
                    device={device}
                    phone={stickerPhoneLabel}
                    issue={issue}
                    parts={stickerParts}
                  />
                </div>
                <p className="mb-4 text-center text-[32px] font-bold leading-tight">
                  Ta etiketten og fest den på konvolutten
                </p>
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
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Åpner luke…
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
                <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-tight">
                  Legg konvolutten i luke {MOCK_LOCKER}
                </h1>
                <div className="flex flex-1 items-center">
                  <LockerVisual
                    openId={lockerOpen}
                    highlightId={MOCK_LOCKER}
                    occupied={occupied.filter((id) => id !== MOCK_LOCKER)}
                    action="insert"
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
                occupied={occupied}
                lockerOpen={lockerOpen}
                onClose={() => {
                  setLockerOpen(null);
                  void finishClose(
                    "DELIVERY_SUCCESS",
                    "DELIVERY_CLOSE_LOCKER",
                    `Repair #${ticket} deposited`,
                  );
                }}
              />
            ) : null}

            {model.screen === "DELIVERY_SUCCESS" ? (
              <ScreenFrame>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <CheckVisual />
                  <h1 className="mt-5 text-[34px] font-bold tracking-tight">
                    Enheten er mottatt
                  </h1>
                  <p className="mt-2 text-[26px] font-bold text-[#2f855a]">
                    Reparasjon #{ticket}
                  </p>
                  <p className="mt-2 max-w-[36ch] text-[22px] font-semibold text-[#3d4454]">
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
                  <h1 className="text-[34px] font-bold tracking-tight">
                    Hent enheten din
                  </h1>
                  <p className="mt-2 mb-5 text-[24px] font-semibold text-[#3d4454]">
                    Skriv inn PIN-koden du har fått.
                  </p>
                  <PinPad value={pin} onChange={setPin} />
                </div>
              </ScreenFrame>
            ) : null}

            {model.screen === "PICKUP_FOUND" ? (
              <ScreenFrame onCancel={() => dispatch({ type: "HOME" })}>
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Fant reparasjonen
                </h1>
                <div className="mx-auto mt-6 w-full max-w-[400px] border-[3px] border-[#1f2430] bg-white p-5">
                  <p className="text-[13px] font-bold tracking-[0.14em] text-[#3d4454]">
                    SD SOLUTIONS
                  </p>
                  <p className="mt-2 text-[24px] font-bold">
                    REPARASJON #{ticket}
                  </p>
                  <p className="mt-1 text-[18px] font-semibold">{device}</p>
                  <p className="mt-3 text-[16px] font-bold text-[#2f855a]">
                    Klar for henting
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
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Åpner luke {MOCK_LOCKER}…
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
                <h1 className="mt-2 text-[32px] font-bold tracking-tight">
                  Ta ut enheten din
                </h1>
                <div className="flex flex-1 items-center">
                  <LockerVisual
                    openId={lockerOpen}
                    highlightId={MOCK_LOCKER}
                    occupied={occupied.filter((id) => id !== MOCK_LOCKER)}
                    action="retrieve"
                  />
                </div>
                <p className="mb-4 text-center text-[32px] font-bold leading-tight">
                  Ta ut konvolutten fra luke {MOCK_LOCKER}
                </p>
                <KioskButton
                  onClick={() => {
                    dispatch({ type: "GO", screen: "PICKUP_CLOSE_LOCKER" });
                  }}
                >
                  Jeg har hentet enheten
                </KioskButton>
              </ScreenFrame>
            ) : null}

            {model.screen === "PICKUP_CLOSE_LOCKER" ? (
              <CloseStep
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
                  <h1 className="text-[30px] font-bold tracking-tight">
                    Takk for besøket
                  </h1>
                  <p className="mt-2 text-[18px] font-semibold text-[#3d4454]">
                    Hvordan var opplevelsen?
                  </p>
                  <div className="mt-8 flex gap-3" role="group" aria-label="Vurdering fra 1 til 5">
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
                        className="flex h-[72px] w-[72px] items-center justify-center border-[3px] border-[#1f2430] bg-white text-[#1e4e82] active:bg-[#d6e4f3] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
                      >
                        <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
                          <path
                            d="M12 3.2 14.6 8.8l6.2.9-4.5 4.4 1.1 6.2L12 17.4 6.6 20.3l1.1-6.2L3.2 9.7l6.2-.9L12 3.2z"
                            fill="#2b6cb0"
                            stroke="#1e4e82"
                            strokeWidth="1.2"
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
                  <h1 className="mt-5 text-[30px] font-bold tracking-tight">
                    Takk for tilbakemeldingen
                  </h1>
                  <p className="mt-2 text-[28px] font-bold tracking-[0.12em] text-[#1e4e82]" aria-label={`${model.rating} av 5 stjerner`}>
                    {"★".repeat(model.rating)}
                    <span className="text-[#8b93a3]">
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
                  <h1 className="text-[30px] font-bold tracking-tight">
                    Administrasjon
                  </h1>
                  <p className="mt-1 mb-5 text-[18px] font-semibold text-[#3d4454]">
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
                liveTickets={liveTickets}
                onOpen={adminOpen}
                onConnectSerial={adminConnectSerial}
                onConnectUsb={adminConnectUsb}
                onSetBaud={adminSetBaud}
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
                <div
                  className="mx-auto mt-8 w-full max-w-[480px] border-[3px] border-[#9b2c2c] bg-white p-6 text-center"
                  role="alert"
                >
                  <p className="text-[14px] font-bold tracking-[0.14em] text-[#9b2c2c]">
                    FEIL
                  </p>
                  <h1 className="mt-2 text-[30px] font-bold tracking-tight">
                    {errorCopy[model.errorKind].title}
                  </h1>
                  <p className="mt-2 text-[18px] font-semibold text-[#3d4454]">
                    {errorCopy[model.errorKind].body}
                  </p>
                </div>
                <div className="flex-1" />
                {model.errorKind === "notfound" ? (
                  <>
                    <KioskButton onClick={startNewOrder}>
                      Opprett serviceordre
                    </KioskButton>
                    <div className="mt-3">
                      <KioskButton
                        variant="ghost"
                        onClick={() => dispatch({ type: "CLEAR_ERROR" })}
                      >
                        Prøv igjen
                      </KioskButton>
                    </div>
                  </>
                ) : (
                  <KioskButton onClick={() => dispatch({ type: "CLEAR_ERROR" })}>
                    Prøv igjen
                  </KioskButton>
                )}
              </ScreenFrame>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function CloseStep({
  occupied,
  lockerOpen,
  onClose,
}: {
  occupied: number[];
  lockerOpen: number | null;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setClosing(true);
  }, []);

  return (
    <ScreenFrame progress={4}>
      <h1 className="mt-2 text-[32px] font-bold tracking-tight">Lukk luken</h1>
      <div className="flex flex-1 items-center">
        <LockerVisual
          openId={closing ? null : lockerOpen}
          highlightId={MOCK_LOCKER}
          occupied={occupied}
        />
      </div>
      <p className="mb-4 text-center text-[32px] font-bold leading-tight">
        Skyv luken igjen
      </p>
      <KioskButton onClick={onClose}>Luken er lukket</KioskButton>
    </ScreenFrame>
  );
}

function AdminScreen({
  lockers,
  activity,
  liveTickets,
  busy,
  lockerOpen,
  demoFailNext,
  onOpen,
  onConnectSerial,
  onConnectUsb,
  onSetBaud,
  onPrint,
  onDemoFail,
  onTestPin,
  onReset,
  onBack,
}: {
  lockers: LockerBay[];
  activity: ActivityEvent[];
  liveTickets: RepairRow[];
  busy: boolean;
  lockerOpen: number | null;
  demoFailNext: ErrorKind | null;
  onOpen: (id: 1 | 2 | 3 | 4) => void;
  onConnectSerial: () => void;
  onConnectUsb: () => void;
  onSetBaud: (baud: number) => void;
  onPrint: () => void;
  onDemoFail: (kind: ErrorKind | null) => void;
  onTestPin: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-[24px] font-bold">Administrasjon</h1>
        <p className="text-[15px] font-semibold text-[#3d4454]">
                    Kunde-PIN 123456 · Innlevering {MOCK_PHONE}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-4">
        <div>
          <p className="mb-2 text-[13px] font-bold tracking-[0.1em] text-[#3d4454]">
            LUKER
          </p>
          <div className="grid grid-cols-2 gap-2">
            {lockers.map((bay) => (
              <button
                key={bay.id}
                type="button"
                disabled={busy}
                onClick={() => onOpen(bay.id)}
                className="border-[3px] border-[#1f2430] bg-white px-3 py-3 text-left active:bg-[#d5d8de] disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
              >
                <p className="text-[14px] font-semibold text-[#3d4454]">
                  Luke {bay.id}
                </p>
                <p className="mt-1 text-[18px] font-bold">
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
            <MiniAction onClick={onConnectSerial}>Koble til TTY / OTID</MiniAction>
            <MiniAction onClick={onConnectUsb}>Koble til USB</MiniAction>
            <MiniAction onClick={() => onSetBaud(9600)}>Baud 9600</MiniAction>
            <MiniAction onClick={() => onSetBaud(19200)}>Baud 19200</MiniAction>
            <MiniAction onClick={onPrint}>Test etikettprinter</MiniAction>
            <MiniAction onClick={onTestPin}>Test PIN</MiniAction>
          </div>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-[#3d4454]">
            OTID vises som TTY. Ikke velg POS-skriveren hvis kiosk-OS allerede bruker den.
          </p>
        </div>
        <div className="min-h-0 overflow-auto border-[3px] border-[#1f2430] bg-white p-3">
          <p className="mb-2 text-[13px] font-bold tracking-[0.1em] text-[#3d4454]">
            LIVE SAKER
          </p>
          <ul className="space-y-1.5 text-[15px] font-semibold">
            {(liveTickets.length ? liveTickets : []).slice(0, 8).map((row) => (
              <li key={row.id} className="flex justify-between gap-3">
                <span>
                  #{row.id} — {row.device}
                  {row.issue ? ` · ${row.issue}` : ""}
                </span>
                <span className="text-[#3d4454]">{row.status}</span>
              </li>
            ))}
            {liveTickets.length === 0 ? (
              <li className="text-[#3d4454]">Ingen åpne innleveringer</li>
            ) : null}
          </ul>
          <p className="mb-2 mt-4 text-[13px] font-bold tracking-[0.1em] text-[#3d4454]">
            AKTIVITET
          </p>
          <ul className="space-y-1 text-[14px] font-semibold text-[#3d4454]">
            {activity.map((row) => (
              <li key={row.id}>
                {row.time} — {row.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
          className="h-12 border-[3px] border-[#1f2430] bg-white px-4 text-[15px] font-bold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
        >
          Tilbakestill
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onBack}
          className="h-12 min-w-[140px] border-[3px] border-[#1e4e82] bg-[#2b6cb0] px-5 text-[16px] font-bold text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
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
      className="h-12 border-[3px] border-[#1f2430] bg-white text-[14px] font-bold active:bg-[#d5d8de] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
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
      aria-pressed={active}
      className={[
        "h-12 border-[3px] px-3 text-[14px] font-bold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]",
        active
          ? "border-[#9b2c2c] bg-[#9b2c2c] text-white"
          : "border-[#1f2430] bg-white text-[#1f2430]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
