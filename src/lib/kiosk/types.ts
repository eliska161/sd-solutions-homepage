export type KioskState =
  | "HOME"
  | "ADMIN_PIN"
  | "ADMIN"
  | "DELIVERY_PHONE"
  | "DELIVERY_SELECT"
  | "DELIVERY_ENVELOPE"
  | "DELIVERY_LABEL"
  | "DELIVERY_OPEN_LOCKER"
  | "DELIVERY_INSERT"
  | "DELIVERY_CLOSE_LOCKER"
  | "DELIVERY_SUCCESS"
  | "PICKUP_PIN"
  | "PICKUP_FOUND"
  | "PICKUP_OPEN_LOCKER"
  | "PICKUP_RETRIEVE"
  | "PICKUP_CLOSE_LOCKER"
  | "RATING"
  | "RATING_THANKS"
  | "ERROR";

export type ErrorKind = "pin" | "locker" | "network" | "generic" | "notfound";

export type LockerStatus = "empty" | "occupied" | "open";

export type LockerBay = {
  id: 1 | 2 | 3 | 4;
  status: LockerStatus;
  ticket?: string;
};

export type RepairRow = {
  id: string;
  device: string;
  status: "Klar for henting" | "Under reparasjon" | "Klar for innlevering";
  phone?: string;
};

export type ActivityEvent = {
  id: string;
  time: string;
  message: string;
};
