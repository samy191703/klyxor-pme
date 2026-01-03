import {
  BusinessUnits,
  ContractTypes,
  Technologies,
} from "@shared/enums/contracts";

export type PatchStep1Payload = {
  // Required (as per your API typing)
  number: string; // if your API treats it optional, change to `number?: string`
  title: string;
  clientId: string;
  clientName: string;
  type: ContractTypes | string; // keep `string` if your backend accepts it
  businessUnit: BusinessUnits | string; // keep `string` if your backend accepts it

  // Optional
  currency?: "EUR" | "USD" | string;
  language?: "FR" | "EN" | string;
  technology?: Technologies | string; // optional, no null
  maintainer?: string; // optional, no null
};
