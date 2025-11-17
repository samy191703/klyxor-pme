// src/modules/invoices/components/InvoiceTable.tsx
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
} from "lucide-react";

import type { Invoice } from "../domain/types";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
} from "../domain/constants";
import { formatDateFR, formatMoneyEUR } from "../utils/formatters";

type Props = {
  rows: Invoice[];
  total: number;
  limit: number;
  offset: number;
  onChangePage: (newLimit: number, newOffset: number) => void;
  onView: (row: Invoice) => void;
  onEdit?: (row: Invoice) => void;
  onDelete: (row: Invoice) => void;
  onDownload?: (row: Invoice) => void;
  downloadingId?: string | null;
  height?: string | number;
  refresh?: () => void;
};

// Fixed column widths
const COLS = [
  200, // N° Facture
  180, // Contrat
  160, // Client
  140, // Montant HT
  140, // Montant TVA
  140, // Montant TTC
  120, // Statut
  140, // Date de création
  180, // Actions
] as const;

function StatusChipInvoice({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return (
        <Chip
          label={INVOICE_STATUS_LABELS[status] ?? "Payé"}
          size="small"
          color="success"
          variant="outlined"
        />
      );
    case "draft":
      return (
        <Chip
          label={INVOICE_STATUS_LABELS[status] ?? "Brouillon"}
          size="small"
          variant="outlined"
        />
      );
    case "inpaid":
      return (
        <Chip
          label={INVOICE_STATUS_LABELS[status] ?? "Non payé"}
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    case "cancelled":
      return (
        <Chip
          label={INVOICE_STATUS_LABELS[status] ?? "Annulée"}
          size="small"
          color="default"
          variant="outlined"
        />
      );
    case "paid_parsely":
      return (
        <Chip
          label={INVOICE_STATUS_LABELS[status] ?? "Partiellement payé"}
          size="small"
          color="info"
          variant="outlined"
        />
      );
    default:
      return (
        <Chip
          label={INVOICE_STATUS_LABELS[status] ?? status}
          size="small"
          variant="outlined"
        />
      );
  }
}

export function InvoiceTable({
  rows,
  total,
  limit,
  offset,
  onChangePage,
  onView,
  onEdit,
  onDelete,
  onDownload,
  downloadingId,
  height = 400,
}: Props) {
  const displayedRows = rows;
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
            minWidth: "1300px",
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
              <TableCell sx={headerCellSx}>N° Facture</TableCell>
              <TableCell sx={headerCellSx}>Contrat</TableCell>
              <TableCell sx={headerCellSx}>Client</TableCell>
              <TableCell sx={headerCellSx} align="right">
                Montant HT
              </TableCell>
              <TableCell sx={headerCellSx} align="right">
                Montant TVA
              </TableCell>
              <TableCell sx={headerCellSx} align="right">
                Montant TTC
              </TableCell>
              <TableCell sx={headerCellSx}>Statut</TableCell>
              <TableCell sx={headerCellSx}>Date de création</TableCell>
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
                    Aucune facture trouvée
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((r) => {
                const isDownloading = downloadingId === r.id;

                return (
                  <TableRow key={r.id} hover>
                    {/* N° Facture */}
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={r.invoiceNumber}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[0] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        {r.invoiceNumber}
                      </Box>
                    </TableCell>

                    {/* Contrat */}
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={r.contractNumber ?? r.contractId}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[1] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.contractNumber ?? r.contractId}
                      </Box>
                    </TableCell>

                    {/* Client */}
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={r.clientName ?? "—"}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[2] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.clientName ?? "—"}
                      </Box>
                    </TableCell>

                    {/* Montant HT */}
                    <TableCell sx={bodyCellSx} align="right">
                      {formatMoneyEUR(r.amount)}
                    </TableCell>

                    {/* Montant TVA */}
                    <TableCell sx={bodyCellSx} align="right">
                      {formatMoneyEUR(r.vatAmount)}
                    </TableCell>

                    {/* Montant TTC */}
                    <TableCell sx={bodyCellSx} align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatMoneyEUR(r.totalAmount)}
                      </Typography>
                    </TableCell>

                    {/* Statut (Chip) */}
                    <TableCell sx={bodyCellSx}>
                      <StatusChipInvoice status={r.status} />
                    </TableCell>

                    {/* Date de création */}
                    <TableCell sx={bodyCellSx}>
                      {formatDateFR(r.createdAt)}
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
                      {/* Télécharger PDF */}
                      {onDownload && (
                        <Tooltip title="Télécharger la facture (PDF)">
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
                      )}

                      {/* Voir */}
                      <Tooltip title="Voir">
                        <IconButton size="small" onClick={() => onView(r)}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>

                      {/* Modifier */}
                      {onEdit && (
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => onEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                      )}

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

      {/* Pagination locale, même style que BillingSchedulesTable */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <TablePagination
          component="div"
          count={total}
          page={Math.floor(offset / limit)}
          rowsPerPage={limit}
          onPageChange={(_, newPage) => onChangePage(limit, newPage * limit)}
          onRowsPerPageChange={(e) => {
            const newLimit = parseInt(e.target.value, 10);
            onChangePage(newLimit, 0);
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

