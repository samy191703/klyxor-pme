// src/_app/ged/components/GEDList.tsx
"use client";

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
  Typography,
} from "@mui/material";
import {
  Visibility as EyeIcon,
  Download as DownloadIcon,
  DeleteOutline as DeleteIcon,
} from "@mui/icons-material";

import type { UploadDocument } from "../domain/types";
import { formatBytesIEC, fmtDateFR } from "../utils/formatters";
import { openUploadDownload } from "../services/uploads.api";

type Props = {
  items: UploadDocument[];
  onPreview?: (doc: UploadDocument) => void;
  onDelete?: (doc: UploadDocument) => void;
  height?: string | number;
};

// Fixed column widths (similar approach to TerminationsTable)
const COLS = [
  300, // Nom
  140, // Type
  160, // Catégorie
  120, // Taille
  160, // MIME
  160, // Ajouté le
  160, // Par
  130, // Actions (sticky)
] as const;

export default function GEDList({
  items,
  onPreview,
  onDelete,
  height = 320,
}: Props) {
  const rows = items ?? [];

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
            minWidth: "1400px",
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
              <TableCell sx={headerCellSx}>Nom</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Catégorie</TableCell>
              <TableCell sx={headerCellSx}>Taille</TableCell>
              <TableCell sx={headerCellSx}>MIME</TableCell>
              <TableCell sx={headerCellSx}>Ajouté le</TableCell>
              <TableCell sx={headerCellSx}>Par</TableCell>
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
                    Aucun document
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((d) => (
                <TableRow key={d.id} hover>
                  {/* Name (clickable for preview if provided) */}
                  <TableCell sx={{ ...bodyCellSx }}>
                    {onPreview ? (
                      <Box
                        component="button"
                        onClick={() => onPreview(d)}
                        title={d.name}
                        sx={{
                          color: "primary.main",
                          textDecoration: "underline",
                          background: "none",
                          border: 0,
                          p: 0,
                          cursor: "pointer",
                          fontWeight: 600,
                          textAlign: "left",
                          maxWidth: COLS[0] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.name}
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        title={d.name}
                        sx={{
                          display: "inline-block",
                          maxWidth: COLS[0] - 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        {d.name}
                      </Box>
                    )}
                  </TableCell>

                  <TableCell sx={bodyCellSx}>{String(d.type)}</TableCell>
                  <TableCell sx={bodyCellSx}>{String(d.category)}</TableCell>
                  <TableCell sx={bodyCellSx}>
                    {formatBytesIEC(d.size)}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{d.mimeType}</TableCell>
                  <TableCell sx={bodyCellSx}>
                    {fmtDateFR(d.uploadedAt)}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{d.uploadedBy || "—"}</TableCell>

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
                    {onPreview && (
                      <Tooltip title="Voir">
                        <IconButton size="small" onClick={() => onPreview(d)}>
                          <EyeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Télécharger">
                      <IconButton
                        size="small"
                        onClick={() => openUploadDownload(d.url)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {onDelete && (
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(d)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
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
