// src/modules/clients/domain/constants.ts
import type { ClientType } from "./types";

export const CLIENTS_QK = {
  root: ["/api/clients"] as const,
  one: (id: string) => ["/api/clients", id] as const,
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  professionnel: "Client professionnel",
  particulier: "Client particulier",
};

export const CLIENT_STATUS_LABELS: Record<"active" | "inactive", string> = {
  active: "Actif",
  inactive: "Inactif",
};
