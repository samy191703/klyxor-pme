import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Info,
} from "lucide-react";
import type { Amendment } from "../domain/types";
import { formatDateFR, formatMoneyEUR } from "../utils/formatters";
import { AMENDMENT_TYPE_LABELS } from "../domain/constants";

export function AmendmentsTable({
  rows,
  onView,
  onEdit,
  onDelete,
  height,
}: {
  rows: Amendment[];
  onView: (a: Amendment) => void;
  onEdit: (a: Amendment) => void;
  onDelete: (id: string) => void;
  height?: string;
}) {
  const COL = {
    number: "w-[260px]",
    contract: "w-[220px]",
    type: "w-[160px]",
    title: "w-[240px]",
    effectDate: "w-[140px]",
    amount: "w-[140px]",
    createdBy: "w-[220px]",
    approvedBy: "w-[220px]",
    createdAt: "w-[160px]",
    status: "w-[160px]",
    actions: "w-[140px]",
  };

  const getStatusBadge = (status: Amendment["status"]) => {
    switch (status) {
      case "active":
        return {
          text: "Actif",
          icon: CheckCircle,
          color: "text-green-600 bg-green-50",
        };
      case "pending_signature":
        return {
          text: "À signer",
          icon: Clock,
          color: "text-yellow-600 bg-yellow-50",
        };
      case "draft":
        return {
          text: "Brouillon",
          icon: FileText,
          color: "text-gray-600 bg-gray-50",
        };
      case "rejected":
        return {
          text: "Rejeté",
          icon: XCircle,
          color: "text-red-600 bg-red-50",
        };
      default:
        return { text: status, icon: Info, color: "text-gray-600 bg-gray-50" };
    }
  };

  return (
    <div className="rounded-md border">
      {/* ONE scroll container for X & Y */}
      <div className=" overflow-auto" style={{ height: height ?? "400px" }}>
        <Table
          className="min-w-[1100px] table-fixed border-separate border-spacing-0"
          // inline style beats any component default (in case it forces collapse)
          style={{ borderCollapse: "separate" }}
        >
          <TableHeader>
            <TableRow>
              {/* sticky on EACH th + opaque bg + z-index */}
              <TableHead className={`sticky top-0 z-20 bg-white ${COL.number}`}>
                Numéro
              </TableHead>
              <TableHead
                className={`sticky top-0 z-20 bg-white ${COL.contract}`}
              >
                Contrat
              </TableHead>
              <TableHead className={`sticky top-0 z-20 bg-white ${COL.type}`}>
                Type
              </TableHead>
              <TableHead className={`sticky top-0 z-20 bg-white ${COL.title}`}>
                Titre
              </TableHead>
              <TableHead
                className={`sticky top-0 z-20 bg-white ${COL.effectDate}`}
              >
                Date d'effet
              </TableHead>
              <TableHead className={`sticky top-0 z-20 bg-white ${COL.amount}`}>
                Montant
              </TableHead>
              <TableHead
                className={`sticky top-0 z-20 bg-white ${COL.createdBy}`}
              >
                Créé par
              </TableHead>
              <TableHead
                className={`sticky top-0 z-20 bg-white ${COL.approvedBy}`}
              >
                Approuvé par
              </TableHead>
              <TableHead
                className={`sticky top-0 z-20 bg-white ${COL.createdAt}`}
              >
                Créé le
              </TableHead>
              <TableHead className={`sticky top-0 z-20 bg-white ${COL.status}`}>
                Statut
              </TableHead>
              <TableHead
                className={`sticky top-0 z-20 bg-white ${COL.actions} text-right`}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-8 text-gray-500"
                >
                  Aucun avenant trouvé
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => {
                const s = getStatusBadge(a.status);
                const Icon = s.icon;
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
                  <TableRow key={a.id} data-testid={`row-amendment-${a.id}`}>
                    <TableCell className={`font-medium ${COL.number}`}>
                      {a.number}
                    </TableCell>
                    <TableCell
                      className={`${COL.contract} max-w-[220px] truncate`}
                      title={a.contractNumber ?? ""}
                    >
                      {a.contractNumber ?? "—"}
                    </TableCell>
                    <TableCell className={`${COL.type}`}>
                      <Badge variant="outline">
                        {AMENDMENT_TYPE_LABELS[a.type]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`${COL.title} max-w-[240px] truncate`}
                      title={a.title ?? "—"}
                    >
                      {a.title || "—"}
                    </TableCell>
                    <TableCell className={`${COL.effectDate}`}>
                      {formatDateFR(a.effectiveDate)}
                    </TableCell>
                    <TableCell className={`${COL.amount}`}>
                      {a.newAmount ? formatMoneyEUR(a.newAmount) : "—"}
                    </TableCell>
                    <TableCell
                      className={`${COL.createdBy} max-w-[220px] truncate`}
                      title={creatorName}
                    >
                      {creatorName}
                    </TableCell>
                    <TableCell
                      className={`${COL.approvedBy} max-w-[220px] truncate`}
                      title={approverName}
                    >
                      {approverName}
                    </TableCell>
                    <TableCell className={`${COL.createdAt}`}>
                      {formatDateFR(a.createdAt)}
                    </TableCell>
                    <TableCell className={`${COL.status}`}>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}
                      >
                        <Icon className="h-3 w-3" /> {s.text}
                      </div>
                    </TableCell>
                    <TableCell className={`${COL.actions} text-right`}>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(a)}
                          data-testid={`button-view-${a.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(a)}
                          data-testid={`button-edit-${a.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {a.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(a.id)}
                            data-testid={`button-delete-${a.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
