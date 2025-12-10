// src/modules/clients/components/ClientsTable.tsx
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

import type { Client } from "../domain/types";
import { CLIENT_TYPE_LABELS } from "../domain/constants";
import { formatDateFR } from "../utils/formatters";

// 🔥 Dialog de suppression pour les clients (même logique que DeleteAmendmentDialog)
// import { DeleteClientDialog } from "./DeleteClientDialog";

type Props = {
  rows: Client[];
  onView: (c: Client) => void;
  onEdit: (c: Client) => void;
  /** Called AFTER a successful deletion (used to refresh parent list) */
  onDelete: (id: string) => void;
  height?: string | number; // viewport height (default 400px)
};

const COLS = [260, 160, 220, 160, 260, 140, 140, 130, 130];

function StatusChip({ isActive }: { isActive?: boolean | null }) {
  if (isActive) {
    return (
      <Chip label="Actif" size="small" color="success" variant="outlined" />
    );
  }
  return (
    <Chip label="Inactif" size="small" color="default" variant="outlined" />
  );
}

export function ClientsTable({
  rows,
  onView,
  onEdit,
  onDelete,
  height = 400,
}: Props) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const [openDelete, setOpenDelete] = React.useState(false);
  const [target, setTarget] = React.useState<Client | null>(null);

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

  const handleAskDelete = (c: Client) => {
    setTarget(c);
    setOpenDelete(true);
  };

  const handleDeleted = (id: string) => {
    onDelete(id);
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
              <TableCell sx={headerCellSx}>Nom / Raison sociale</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Email</TableCell>
              <TableCell sx={headerCellSx}>Téléphone</TableCell>
              <TableCell sx={headerCellSx}>Adresse</TableCell>
              <TableCell sx={headerCellSx}>Ville</TableCell>
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
                    Aucun client trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((c) => {
                const label =
                  c.typeClient === "professionnel"
                    ? c.companyName
                    : [c.lastName, c.firstName].filter(Boolean).join(" ");

                const addressParts = [
                  c.address?.trim(),
                  [c.postalCode, c.city].filter(Boolean).join(" "),
                  c.country?.trim(),
                ].filter(Boolean);
                const address = addressParts.length
                  ? addressParts.join(", ")
                  : "—";

                const canDelete = !c.activeContractsCount; // ⬅ ex: business rule: pas de contrats actifs

                return (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>
                      {label || "—"}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      {CLIENT_TYPE_LABELS[c.typeClient] ?? c.typeClient}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>{c.email || "—"}</TableCell>
                    <TableCell sx={bodyCellSx}>{c.phone || "—"}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        title={address}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[4] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {address}
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>{c.city || "—"}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      {formatDateFR(c.createdAt)}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip isActive={c.isActive} />
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
                        <IconButton size="small" onClick={() => onView(c)}>
                          <EyeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => onEdit(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canDelete && (
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() => handleAskDelete(c)}
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

      {/* Pagination client-side */}
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
          labelRowsPerPage="Lignes par page"/>
      </Box>

      {/* Dialog de suppression inline (comme pour les avenants) */}
      {/* <DeleteClientDialog
        open={openDelete}
        onOpenChange={(v) => {
          setOpenDelete(v);
          if (!v) setTarget(null);
        }}
        client={target ?? undefined}
        canDelete={Boolean(target && !target.activeContractsCount)}
        onDeleted={(id) => handleDeleted(id)}
      /> */}
    </Paper>
  );
}

export default ClientsTable;