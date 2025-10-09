// src/_app/ged/components/GEDFilters.tsx
"use client";

import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import { Search as SearchIcon } from "lucide-react";
import type { GEDFilters } from "../domain/types";
import { DocumentTypes } from "../domain/constants";

type Props = {
  value: GEDFilters;
  onChange: (patch: Partial<GEDFilters>) => void;
  authors?: string[];
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: DocumentTypes.CONTRACT, label: "Contrat" },
  { value: DocumentTypes.AMENDMENT, label: "Avenant" },
  { value: DocumentTypes.INVOICE, label: "Facture" },
  { value: DocumentTypes.ATTESTATION, label: "Attestation" },
  { value: DocumentTypes.OTHER, label: "Autre" },
];

export default function GEDFilters({ value, onChange, authors = [] }: Props) {
  return (
    <>
      {/* Recherche (nom / type / catégorie / auteur) */}
      <TextField
        label="Recherche (nom / type / catégorie / auteur)"
        value={value.search ?? ""}
        onChange={(e) => onChange({ search: e.target.value })}
        size="small"
        fullWidth
        color="primary"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon size={18} />
            </InputAdornment>
          ),
        }}
      />

      {/* Type de document */}
      <TextField
        select
        label="Type de document"
        value={value.type ?? "all"}
        onChange={(e) => onChange({ type: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      >
        {TYPE_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Auteur */}
      <TextField
        select
        label="Auteur"
        value={value.author ?? "all"}
        onChange={(e) => onChange({ author: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tous les auteurs</MenuItem>
        {authors.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}
