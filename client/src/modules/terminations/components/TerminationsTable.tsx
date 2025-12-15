// src/modules/terminations/components/TerminationsTable.tsx
import * as React from "react";
import {
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Typography,
} from "@mui/material";
import {
  Visibility as EyeIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import type { Termination as BaseTermination } from "../domain/types";
import { TERMINATION_STATUS_LABEL } from "../domain/constants";
import { formatDateFR, formatMoneyEUR } from "../utils/formatters";

type UserMini = { id: string; name: string; email?: string | null } | null;

export type TerminationRow = BaseTermination & {
  contractNumber?: string | null;

  requestedByUser?: UserMini;
  assignedValidatorUser?: UserMini;
  validatedByUser?: UserMini;
  executedByUser?: UserMini;
};

type Props = {
  rows: TerminationRow[];
  onView: (t: TerminationRow) => void;
  onValidate: (t: TerminationRow) => void;
  onReject: (t: TerminationRow) => void;
  height?: string | number;
};

// Local label map for type (schema: "non_renewal" | "mutual_agreement" | "breach" | "other")
const TYPE_LABEL: Record<string, string> = {
  non_renewal: "Non-renouvellement",
  mutual_agreement: "Accord mutuel",
  breach: "Rupture",
  other: "Autre",
};

// Wider table to fit more columns; horizontal scroll is allowed
const COLS = [
  160, // N°
  180, // Contrat
  160, // Type
  240, // Motif
  120, // Date d'effet
  120, // Préavis
  140, // Indemnité
  140, // Statut
  180, // Demandée par
  180, // Assignée à
  180, // Validée par
  180, // Exécutée par
  140, // Dernière MàJ
  130, // Actions
] as const;

const userLabel = (u?: UserMini, fallback?: string | null) => {
  if (!u || !u?.name) return fallback ?? "—";
  return u.email ? (
    <Tooltip title={u.email}>
      <Box component="span" sx={{ cursor: "default" }}>
        {u.name}
      </Box>
    </Tooltip>
  ) : (
    u.name
  );
};

function StatusChip({ status }: { status: TerminationRow["status"] }) {
  switch (status) {
    case "validated":
      return (
        <Chip
          label={TERMINATION_STATUS_LABEL?.validated ?? "Validée"}
          size="small"
          color="success"
          variant="outlined"
        />
      );
    case "pending_validation":
      return (
        <Chip
          label={
            TERMINATION_STATUS_LABEL?.pending_validation ?? "En validation"
          }
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    case "draft":
      return (
        <Chip
          label={TERMINATION_STATUS_LABEL?.draft ?? "Brouillon"}
          size="small"
          variant="outlined"
        />
      );
    case "rejected":
      return (
        <Chip
          label={TERMINATION_STATUS_LABEL?.rejected ?? "Rejetée"}
          size="small"
          color="error"
          variant="outlined"
        />
      );
    case "executed":
      return (
        <Chip
          label={TERMINATION_STATUS_LABEL?.executed ?? "Exécutée"}
          size="small"
          color="primary"
          variant="outlined"
        />
      );
    default:
      return <Chip label={status} size="small" variant="outlined" />;
  }
}

export default function TerminationsTable({
  rows,
  onView,
  onValidate,
  onReject,
  height = 400,
}: Props) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const displayedRows = React.useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const headerCellSx = {
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap",
  } as const;
  const bodyCellSx = { fontSize: 13, verticalAlign: "middle" } as const;

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1, display: "flex", flexDirection: "column" }}
    >
      <TableContainer sx={{ maxHeight: height, overflowX: "auto" }}>
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "fixed",
            minWidth: "1600px",
            "& th, & td": { borderBottomColor: "rgba(0,0,0,0.06)" },
          }}
        >
          <colgroup>
            {COLS.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>N° résiliation</TableCell>
              <TableCell sx={headerCellSx}>Contrat</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Motif</TableCell>
              <TableCell sx={headerCellSx}>Date d'effet</TableCell>
              <TableCell sx={headerCellSx}>Préavis</TableCell>
              <TableCell sx={headerCellSx}>Indemnité</TableCell>
              <TableCell sx={headerCellSx}>Statut</TableCell>
              <TableCell sx={headerCellSx}>Demandée par</TableCell>
              {/* <TableCell sx={headerCellSx}>Assignée à</TableCell> */}
              <TableCell sx={headerCellSx}>Validée par</TableCell>
              <TableCell sx={headerCellSx}>Exécutée par</TableCell>
              <TableCell sx={headerCellSx}>Dernière MàJ</TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  textAlign: "center",
                  position: "sticky",
                  right: 0,
                  zIndex: 2,
                  bgcolor: "background.paper",
                  boxShadow: "-4px 0 6px -2px rgba(0,0,0,0.1)",
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLS.length} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucune résiliation trouvée
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((t) => (
                <TableRow key={t.id} hover>
                  {/* Number (clickable) */}
                  <TableCell sx={{ ...bodyCellSx }}>
                    <Box
                      component="button"
                      onClick={() => onView(t)}
                      title={`ID: ${t.id}`}
                      sx={{
                        color: "primary.main",
                        textDecoration: "underline",
                        background: "none",
                        border: 0,
                        p: 0,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {t.number ?? t.id}
                    </Box>
                  </TableCell>

                  {/* Contract (joined) */}
                  <TableCell sx={bodyCellSx}>
                    <Box sx={{ fontWeight: 600 }}>
                      {t.contractNumber ?? t.contractId}
                    </Box>
                  </TableCell>

                  {/* Type */}
                  <TableCell sx={bodyCellSx}>
                    {TYPE_LABEL[t.type] ?? t.type ?? "—"}
                  </TableCell>

                  {/* Reason */}
                  <TableCell sx={bodyCellSx}>
                    <Box
                      component="span"
                      title={t.reason}
                      sx={{
                        display: "inline-block",
                        maxWidth: COLS[3] - 16,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.reason}
                    </Box>
                  </TableCell>

                  {/* Effective date */}
                  <TableCell sx={bodyCellSx}>
                    {t.effectiveDate ? formatDateFR(t.effectiveDate) : "—"}
                  </TableCell>

                  {/* Notice date */}
                  <TableCell sx={bodyCellSx}>
                    {t.noticeDate ? formatDateFR(t.noticeDate) : "—"}
                  </TableCell>

                  {/* Compensation amount */}
                  <TableCell sx={bodyCellSx}>
                    {t.compensationAmount != null
                      ? formatMoneyEUR?.(t.compensationAmount as any) ??
                        Number(t.compensationAmount).toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })
                      : "—"}
                  </TableCell>

                  {/* Status */}
                  <TableCell sx={bodyCellSx}>
                    <StatusChip status={t.status} />
                  </TableCell>

                  {/* Requested by (joined) */}
                  <TableCell sx={bodyCellSx}>
                    {userLabel(t.requestedByUser, t.requestedBy ?? null)}
                  </TableCell>

                  {/* Assigned validator (joined) */}
                  {/* <TableCell sx={bodyCellSx}>
                    {userLabel(
                      t.assignedValidatorUser,
                      t.assignedValidator ?? null
                    )}
                  </TableCell> */}

                  {/* Validated by (joined) */}
                  <TableCell sx={bodyCellSx}>
                    {userLabel(t.validatedByUser, t.validatedBy ?? null)}
                  </TableCell>

                  {/* Executed by (joined) */}
                  <TableCell sx={bodyCellSx}>
                    {userLabel(t.executedByUser, t.executedBy ?? null)}
                  </TableCell>

                  {/* Last update */}
                  <TableCell sx={bodyCellSx}>
                    {t.updatedAt ? formatDateFR(t.updatedAt) : "—"}
                  </TableCell>

                  {/* Actions (sticky) */}
                  <TableCell
                    sx={{
                      ...bodyCellSx,
                      textAlign: "right",
                      position: "sticky",
                      right: 0,
                      zIndex: 1,
                      bgcolor: "background.paper",
                      boxShadow: "-4px 0 6px -2px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Tooltip title="Voir">
                      <IconButton size="small" onClick={() => onView(t)}>
                        <EyeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {t.status === "pending_validation" && (
                      <>
                        <Tooltip title="Valider">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onValidate(t)}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rejeter">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onReject(t)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination locale */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} sur ${count}`
          }
        />
      </Box>
    </Paper>
  );
}
