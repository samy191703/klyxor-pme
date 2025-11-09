// src/modules/billing/components/BillingSchedulesTable.tsx
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
  Eye,
  Pencil,
  Trash2,
  Download,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

import type { BillingSchedule } from "../domain/types";
import {
  BILLING_FREQUENCY_LABELS,
  BILLING_TYPE_LABELS,
  BILLING_STATUS_LABELS,
} from "../domain/constants";
import { formatDateFR } from "../utils/formatters";

type Props = {
  rows: BillingSchedule[];
  onView: (row: BillingSchedule) => void;
  onEdit: (row: BillingSchedule) => void;
  onDelete: (row: BillingSchedule) => void;
  onDownload: (row: BillingSchedule) => void;
  onExportExcel: (row: BillingSchedule) => void;
  downloadingId?: string | null;
  exportingId?: string | null;
  height?: string | number;
};

// Fixed column widths (same idea as TerminationsTable)
const COLS = [
  180, // Contrat
  220, // Période
  140, // Fréquence
  140, // Type
  90, // Version
  140, // Statut
  180, // Actions
] as const;

function StatusChipBilling({ status }: { status: BillingSchedule["status"] }) {
  switch (status) {
    case "active":
      return (
        <Chip
          label={BILLING_STATUS_LABELS[status] ?? "Active"}
          size="small"
          color="success"
          variant="outlined"
        />
      );
    case "draft":
      return (
        <Chip
          label={BILLING_STATUS_LABELS[status] ?? "Brouillon"}
          size="small"
          variant="outlined"
        />
      );
    case "archived":
      return (
        <Chip
          label={BILLING_STATUS_LABELS[status] ?? "Archivé"}
          size="small"
          color="default"
          variant="outlined"
        />
      );
    default:
      return (
        <Chip
          label={BILLING_STATUS_LABELS[status] ?? status}
          size="small"
          variant="outlined"
        />
      );
  }
}

export function BillingSchedulesTable({
  rows,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onExportExcel,
  downloadingId,
  exportingId,
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

  const bodyCellSx = {
    fontSize: 13,
    verticalAlign: "middle",
  } as const;

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
            minWidth: "1100px",
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
              <TableCell sx={headerCellSx}>Contrat</TableCell>
              <TableCell sx={headerCellSx}>Période</TableCell>
              <TableCell sx={headerCellSx}>Fréquence</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Version</TableCell>
              <TableCell sx={headerCellSx}>Statut</TableCell>
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
                    Aucun échéancier trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((r) => {
                const isDownloading = downloadingId === r.id;
                const isExporting = exportingId === r.id;

                return (
                  <TableRow key={r.id} hover>
                    {/* Contrat */}
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={r.contractNumber ?? r.contractId}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[0] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        {r.contractNumber ?? r.contractId}
                      </Box>
                    </TableCell>

                    {/* Période */}
                    <TableCell sx={bodyCellSx}>
                      {formatDateFR(r.startDate)} — {formatDateFR(r.endDate)}
                    </TableCell>

                    {/* Fréquence (label) */}
                    <TableCell sx={bodyCellSx}>
                      {BILLING_FREQUENCY_LABELS[r.frequency] ?? r.frequency}
                    </TableCell>

                    {/* Type (label) */}
                    <TableCell sx={bodyCellSx}>
                      {BILLING_TYPE_LABELS[r.billingType] ?? r.billingType}
                    </TableCell>

                    {/* Version */}
                    <TableCell sx={bodyCellSx}>{r.version}</TableCell>

                    {/* Statut (Chip) */}
                    <TableCell sx={bodyCellSx}>
                      <StatusChipBilling status={r.status} />
                    </TableCell>

                    {/* Actions (sticky right) */}
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
                      {/* Export Excel */}
                      <Tooltip title="Exporter en Excel">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onExportExcel(r)}
                            disabled={!!isExporting}
                          >
                            {isExporting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="h-4 w-4" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* Télécharger PDF */}
                      <Tooltip title="Télécharger l’échéancier (PDF)">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onDownload(r)}
                            disabled={!!isDownloading}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* Voir */}
                      <Tooltip title="Voir">
                        <IconButton size="small" onClick={() => onView(r)}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>

                      {/* Modifier */}
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => onEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>

                      {/* Supprimer */}
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination locale, même style que TerminationsTable */}
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
