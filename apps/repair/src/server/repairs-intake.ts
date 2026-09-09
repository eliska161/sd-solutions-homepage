"use server";

import { z } from "zod";
import { createDevice } from "@/server/devices";
import { createRepair } from "@/server/repairs";

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

export async function createRepairTicketFromForm(
  input: z.infer<typeof schema>,
) {
  const data = schema.parse(input);
  let deviceId = data.deviceId || "";

  if (data.createNewDevice || !deviceId) {
    const model = data.model?.trim();
    if (!model) throw new Error("Modell er påkrevd for ny enhet");
    const device = await createDevice({
      brand: data.brand?.trim() || "Apple",
      model,
      storage: data.storage || null,
      color: data.color || null,
      imei: data.imei || null,
      serialNumber: data.serialNumber || null,
      ownershipType: "CUSTOMER",
      customerId: data.customerId,
    });
    deviceId = device.id;
  }

  const repair = await createRepair({
    customerId: data.customerId,
    deviceId,
    customerProblem: data.customerProblem,
    physicalCondition: data.physicalCondition || null,
  });

  return { id: repair.id, ticketNumber: repair.ticketNumber };
}
