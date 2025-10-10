import * as React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Box,
} from "@mui/material";
import { Eye, Check, X, Share2 } from "lucide-react";
import type { ValidationRequest } from "../domain/types";
import { VALIDATION_STATUS_LABEL } from "../domain/constants";

type Props = {
  rows: ValidationRequest[];
  height?: string | number;
  onView: (vr: ValidationRequest) => void;
  onApprove: (vr: ValidationRequest) => void;
  onReject: (vr: ValidationRequest) => void;
  onRedirect: (vr: ValidationRequest) => void;
};

const COLS = [180, 280, 220, 160, 180, 140] as const;
const STATUS_COLOR: Record<
  ValidationRequest["status"],
  "default" | "success" | "warning" | "error" | "info"
> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  redirected: "info",
};

const userCell = (
  user?: { name?: string | null; email?: string | null } | null,
  fallback?: string | null
) => {
  if (!user?.name) return fallback ?? "—";
  return user.email ? (
    <Tooltip title={user.email}>
      <Box component="span" sx={{ cursor: "default" }}>
        {user.name}
      </Box>
    </Tooltip>
  ) : (
    user.name
  );
};

export default function ValidationRequestsTable({
  rows,
  height = "420px",
  onView,
  onApprove,
  onReject,
  onRedirect,
}: Props) {
  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: height }}>
        <Table size="small" stickyHeader>
          <colgroup>
            {COLS.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell>Référence</TableCell>
              <TableCell>Sujet</TableCell>
              <TableCell>Assignée à</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Créée le</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell title={r.reference}>{r.reference}</TableCell>
                <TableCell title={r.subject}>{r.subject}</TableCell>

                {/* 👉 affiche le nom/email joint au lieu de l'userId brut */}
                <TableCell>
                  {userCell(r.assignedToUser, r.assignedTo)}
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    color={STATUS_COLOR[r.status]}
                    label={VALIDATION_STATUS_LABEL[r.status]}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {new Date(r.createdAt).toLocaleString("fr-FR")}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Voir">
                    <IconButton size="small" onClick={() => onView(r)}>
                      <Eye className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Approuver">
                    <IconButton size="small" onClick={() => onApprove(r)}>
                      <Check className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rejeter">
                    <IconButton size="small" onClick={() => onReject(r)}>
                      <X className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rediriger">
                    <IconButton size="small" onClick={() => onRedirect(r)}>
                      <Share2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  Aucune demande trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
