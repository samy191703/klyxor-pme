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
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  UnfoldMore as UnfoldMoreIcon,
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

type SortField = "name" | "type" | "email" | "phone" | "city" | "createdAt" | "status" | null;
type SortOrder = "asc" | "desc" | null;

interface SortState {
  field: SortField;
  order: SortOrder;
}

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
  const [sort, setSort] = React.useState<SortState>({
    field: null,
    order: null,
  });

  // Tri des données
  const sortedRows = React.useMemo(() => {
    if (!sort.field || !sort.order) return rows;

    return [...rows].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case "name":
          const nameA =
            a.typeClient === "professionnel"
              ? a.companyName || ""
              : [a.lastName, a.firstName].filter(Boolean).join(" ");
          const nameB =
            b.typeClient === "professionnel"
              ? b.companyName || ""
              : [b.lastName, b.firstName].filter(Boolean).join(" ");
          comparison = nameA.localeCompare(nameB, "fr", {
            sensitivity: "base",
          });
          break;

        case "type":
          comparison = a.typeClient.localeCompare(b.typeClient);
          break;

        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;

        case "phone":
          comparison = (a.phone || "").localeCompare(b.phone || "");
          break;

        case "city":
          comparison = (a.city || "").localeCompare(b.city || "");
          break;

        case "createdAt":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;

        case "status":
          const statusA = a.isActive ? 1 : 0;
          const statusB = b.isActive ? 1 : 0;
          comparison = statusA - statusB;
          break;

        default:
          return 0;
      }

      return sort.order === "asc" ? comparison : -comparison;
    });
  }, [rows, sort.field, sort.order]);

  const displayedRows = React.useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field !== field) {
        return { field, order: "asc" };
      }
      if (prev.order === "asc") {
        return { field, order: "desc" };
      }
      return { field: null, order: null };
    });
    setPage(0); // Reset to first page when sorting
  };

  const renderSortIcon = (field: SortField) => {
    if (sort.field !== field || !sort.order) {
      return <UnfoldMoreIcon sx={{ fontSize: 16, opacity: 0.3 }} />;
    }
    return sort.order === "asc" ? (
      <ArrowUpIcon sx={{ fontSize: 16 }} />
    ) : (
      <ArrowDownIcon sx={{ fontSize: 16 }} />
    );
  };

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
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("name")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Nom / Raison sociale
                  {renderSortIcon("name")}
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("type")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Type
                  {renderSortIcon("type")}
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("email")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Email
                  {renderSortIcon("email")}
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("phone")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Téléphone
                  {renderSortIcon("phone")}
                </Box>
              </TableCell>
              <TableCell sx={headerCellSx}>Adresse</TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("city")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Ville
                  {renderSortIcon("city")}
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("createdAt")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Créé le
                  {renderSortIcon("createdAt")}
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleSort("status")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Statut
                  {renderSortIcon("status")}
                </Box>
              </TableCell>
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
                            onClick={() => onDelete(c.id)}
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
          count={sortedRows.length}
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
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </Box>

    </Paper>
  );
}

export default ClientsTable;