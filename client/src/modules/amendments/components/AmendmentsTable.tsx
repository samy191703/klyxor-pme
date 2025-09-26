// AmendmentsTable.tsx
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
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

import type { Amendment } from "../domain/types";
import { AMENDMENT_TYPE_LABELS } from "../domain/constants";
import { formatDateFR, formatMoneyEUR } from "../utils/formatters";

// ⬇️ Import the dialog
import { DeleteAmendmentDialog } from "./DeleteAmendmentDialog";

type Props = {
  rows: Amendment[];
  onView: (a: Amendment) => void;
  onEdit: (a: Amendment) => void;
  /** Called AFTER a successful deletion (used to refresh parent list) */
  onDelete: (id: string) => void;
  height?: string | number; // viewport height (default 400px)
};

const COLS = [260, 220, 160, 240, 140, 140, 220, 220, 160, 160, 130];

function StatusChip({ status }: { status: Amendment["status"] }) {
  switch (status) {
    case "active":
      return (
        <Chip label="Actif" size="small" color="success" variant="outlined" />
      );
    case "pending_signature":
      return (
        <Chip
          label="À signer"
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    case "draft":
      return <Chip label="Brouillon" size="small" variant="outlined" />;
    case "rejected":
      return (
        <Chip label="Rejeté" size="small" color="error" variant="outlined" />
      );
    default:
      return <Chip label={status} size="small" variant="outlined" />;
  }
}

export function AmendmentsTable({
  rows,
  onView,
  onEdit,
  onDelete,
  height = 400,
}: Props) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  // ⬇️ Local state to drive the delete dialog
  const [openDelete, setOpenDelete] = React.useState(false);
  const [target, setTarget] = React.useState<Amendment | null>(null);

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

  const handleAskDelete = (a: Amendment) => {
    setTarget(a);
    setOpenDelete(true);
  };

  const handleDeleted = (id: string) => {
    // Let parent refresh/cleanup
    onDelete(id);
    // Local dialog cleanup
    setOpenDelete(false);
    setTarget(null);
  };

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1, display: "flex", flexDirection: "column" }}
    >
      <TableContainer sx={{ maxHeight: height, overflowX: "auto" }}>
        <Table
          stickyHeader
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
              <TableCell sx={headerCellSx}>Numéro</TableCell>
              <TableCell sx={headerCellSx}>Contrat</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Titre</TableCell>
              <TableCell sx={headerCellSx}>Date d'effet</TableCell>
              <TableCell sx={headerCellSx}>Montant</TableCell>
              <TableCell sx={headerCellSx}>Créé par</TableCell>
              <TableCell sx={headerCellSx}>Approuvé par</TableCell>
              <TableCell sx={headerCellSx}>Créé le</TableCell>
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
                    Aucun avenant trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((a) => {
                const creatorName =
                  a.requestedByUser?.name ??
                  a.requestedByUser?.email ??
                  a.requestedBy ??
                  "—";
                const approverName =
                  a.approvedByUser?.name ??
                  a.approvedByUser?.email ??
                  (a.approvedBy ? a.approvedBy : "—");

                return (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>
                      {a.number}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={a.contractNumber ?? ""}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[1] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.contractNumber ?? "—"}
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Chip
                        label={AMENDMENT_TYPE_LABELS[a.type]}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={a.title ?? "—"}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[3] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.title || "—"}
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      {formatDateFR(a.effectiveDate)}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      {a.newAmount
                        ? formatMoneyEUR(a.newAmount.toString())
                        : "—"}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>{creatorName}</TableCell>
                    <TableCell sx={bodyCellSx}>{approverName}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      {formatDateFR(a.createdAt)}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip status={a.status} />
                    </TableCell>
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
                        <IconButton size="small" onClick={() => onView(a)}>
                          <EyeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => onEdit(a)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {a.status === "draft" && (
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() => handleAskDelete(a)}
                          >
                            <DeleteIcon
                              fontSize="small"
                              sx={{ color: "error.main" }}
                            />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Simple client-side paginator */}
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

      {/* ⬇️ Inline Delete dialog */}
      <DeleteAmendmentDialog
        open={openDelete}
        onOpenChange={(v) => {
          setOpenDelete(v);
          if (!v) setTarget(null);
        }}
        a={target ?? undefined}
        canDelete={Boolean(target && target.status === "draft")}
        // Notify parent AFTER the mutation succeeds
        onDeleted={(id) => handleDeleted(id)}
      />
    </Paper>
  );
}

export default AmendmentsTable;
