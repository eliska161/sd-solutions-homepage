"use server";

import { z } from "zod";
import { createDevice, updateDevice } from "@/server/devices";
import { createRepair } from "@/server/repairs";
import { normalizeImei } from "@/lib/imei-lookup";

const schema = z.object({
  customerId: z.string().uuid(),
  deviceId: z.string().uuid().nullable().optional(),
  createNewDevice: z.boolean(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  imei: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  customerProblem: z.string().min(1),
  physicalCondition: z.string().optional().nullable(),
});

function cleanImei(raw: string | null | undefined) {
  if (!raw?.trim()) return null;
  const digits = normalizeImei(raw);
  return digits || raw.trim();
}

export async function createRepairTicketFromForm(
  input: z.infer<typeof schema>,
) {
  const data = schema.parse(input);
  const imei = cleanImei(data.imei);
  const serialNumber = data.serialNumber?.trim() || null;
  let deviceId = data.deviceId || "";

  if (data.createNewDevice || !deviceId) {
    const model = data.model?.trim();
    if (!model) throw new Error("Modell er påkrevd for ny enhet");
    const device = await createDevice({
      brand: data.brand?.trim() || "Apple",
      model,
      storage: data.storage || null,
      color: data.color || null,
      imei,
      serialNumber,
      ownershipType: "CUSTOMER",
      customerId: data.customerId,
    });
    deviceId = device.id;
  } else {
    // Existing device: still persist IMEI / serial / identity fields entered in the form
    await updateDevice(deviceId, {
      ...(data.brand?.trim() ? { brand: data.brand.trim() } : {}),
      ...(data.model?.trim() ? { model: data.model.trim() } : {}),
      storage: data.storage || null,
      color: data.color || null,
      imei,
      serialNumber,
      customerId: data.customerId,
    });
  }

  const repair = await createRepair({
    customerId: data.customerId,
    deviceId,
    customerProblem: data.customerProblem,
    physicalCondition: data.physicalCondition || null,
  });

  return { id: repair.id, ticketNumber: repair.ticketNumber };
}
