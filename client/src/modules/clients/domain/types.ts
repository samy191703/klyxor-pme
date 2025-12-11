// src/modules/clients/domain/types.ts

export type ClientType = "professionnel" | "particulier";

export interface BaseClient {
  id: string;
  typeClient: ClientType;
  isActive: boolean;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  paymentTerms?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // counts
  activeContractsCount?: number;
  closedContractsCount?: number;
}

export interface ProfessionalClient extends BaseClient {
  typeClient: "professionnel";
  companyName: string;
  siret: string;
  lastName?: string | null;  // optional contact name
  firstName?: string | null;
}

export interface IndividualClient extends BaseClient {
  typeClient: "particulier";
  lastName: string;
  firstName: string;
  companyName?: string | null;
  siret?: string | null;
}

export type Client = ProfessionalClient | IndividualClient;

/**
 * DTOs
 * Back routes:
 *  - POST /api/clients
 *  - PATCH /api/clients/:id
 */

export interface ClientCreateDto {
  typeClient: ClientType;

  // Professional
  companyName?: string;
  siret?: string;

  // Individual
  lastName?: string;
  firstName?: string;

  email: string;
  phone?: string;
  address: string;
  postalCode: string;
  city: string;
  country?: string;
  paymentTerms?: string;

  isActive?: boolean;
}

export interface ClientUpdateDto {
  typeClient?: ClientType;

  companyName?: string | null;
  siret?: string | null;

  lastName?: string | null;
  firstName?: string | null;

  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  paymentTerms?: string | null;
  isActive?: boolean;
}

/**
 * Simple contract projection for the "Contrats liés" section
 */
export interface ClientContractSummary {
  id: string;
  number: string;
  title: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}
