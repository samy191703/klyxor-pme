"use client";

import { Fragment, useMemo } from "react";
import { Clock, Info, XCircle, CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

import { TerminationStatus, type Termination } from "../domain/types";
import {
  TERMINATION_STATUS_LABEL,
  // if you rely on custom colors elsewhere, keep your map; we render Tailwind classes here
} from "../domain/constants";
import { formatDateFR } from "../utils/formatters";

type Props = {
  open: boolean;
  onClose: () => void;
  data: Termination | null;
  onValidate: () => void;
  onReject: () => void;
};

const TYPE_LABEL: Record<string, string> = {
  non_renewal: "Non-reconduction",
  mutual_agreement: "Accord mutuel",
  breach: "Rupture",
  other: "Autre",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  to_validate: "bg-amber-100 text-amber-800 border-amber-200",
  validated: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  closed: "bg-slate-100 text-slate-800 border-slate-200",
};

function fmtDate(d?: string | null) {
  return d ? formatDateFR(d) : "—";
}

const moneyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtMoney(v?: number | string | null) {
  if (v === undefined || v === null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return moneyFmt.format(n);
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-3 items-start">
      <div className="col-span-1 text-sm text-muted-foreground">{label}</div>
      <div className={`col-span-3 text-sm ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function ViewTerminationDialog({
  open,
  onClose,
  data,
  onValidate,
  onReject,
}: Props) {
  const canValidate = data?.status === TerminationStatus.PENDING_VALIDATION;

  const statusBadge = useMemo(() => {
    if (!data) return null;
    const label =
      TERMINATION_STATUS_LABEL[
        data.status as keyof typeof TERMINATION_STATUS_LABEL
      ] ?? data.status;
    const klass =
      STATUS_STYLE[data.status as keyof typeof STATUS_STYLE] ??
      "bg-gray-100 text-gray-800 border-gray-200";
    return (
      <Badge variant="outline" className={klass}>
        {label}
      </Badge>
    );
  }, [data]);

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détail de la demande de résiliation</DialogTitle>
          <DialogDescription>
            Demande&nbsp;<span className="font-mono">{data.id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Top status / SLA */}
        {/*  <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          {typeof data.sla === "number" && data.sla >= 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              {data.sla}h restantes
            </Badge>
          )}
        </div> */}

        <Separator className="my-4" />

        {/* Contract section */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium mb-1">Contrat</div>
            <Row
              label="Contrat"
              value={<span className="font-medium">{data.number ?? "—"}</span>}
            />
            <Row label="ID contrat" value={data.id ?? "—"} mono />
          </CardContent>
        </Card>

        {/* Termination details */}
        <Card className="mt-4">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium mb-1">
              Paramètres de la résiliation
            </div>
            <Row
              label="Type"
              value={
                TYPE_LABEL[(data as any).type as keyof typeof TYPE_LABEL] ??
                (data as any).type ??
                "—"
              }
            />
            <Row
              label="Date d'effet"
              value={fmtDate((data as any).effectiveDate)}
            />
            <Row
              label="Date de préavis"
              value={fmtDate((data as any).noticeDate)}
            />
            <Row
              label="Indemnité"
              value={fmtMoney((data as any).compensationAmount)}
            />
            <Row label="Motif" value={data.reason || "—"} />
            <Row label="Description" value={(data as any).description || "—"} />
          </CardContent>
        </Card>

        {/* Workflow */}
        <Card className="mt-4">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium mb-1">Workflow</div>
            <Row
              label="Demandeur"
              value={data.requestedByUser ? data.requestedByUser.name : "—"}
            />
            <Row
              label="Valideur assigné"
              value={data.assignedValidator ?? "—"}
            />
            <div className="grid grid-cols-2 gap-4">
              <Fragment>
                <Row
                  label="Validé par"
                  value={(data as any).validatedBy ?? "—"}
                />
                <Row
                  label="Validé le"
                  value={fmtDate((data as any).validatedAt)}
                />
              </Fragment>
              <Fragment>
                <Row
                  label="Rejeté par"
                  value={(data as any).rejectedBy ?? "—"}
                />
                <Row
                  label="Rejeté le"
                  value={fmtDate((data as any).rejectedAt)}
                />
              </Fragment>
            </div>
          </CardContent>
        </Card>

        {/* Audit */}
        <Card className="mt-4">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium mb-1">Audit</div>
            <Row label="Créée le" value={fmtDate((data as any).createdAt)} />
            <Row
              label="Mise à jour le"
              value={fmtDate((data as any).updatedAt)}
            />
          </CardContent>
        </Card>

        {/* Rejection reason */}
        {(data as any).rejectionReason ? (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">
              Motif de rejet : {(data as any).rejectionReason}
            </AlertDescription>
          </Alert>
        ) : data.status === "validated" ? (
          <Alert className="mt-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Cette demande a été validée.</AlertDescription>
          </Alert>
        ) : (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Vérifiez les informations avant d&apos;agir.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-2">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {canValidate ? (
              <div className="flex gap-2">
                <Button variant="destructive" onClick={onReject}>
                  Rejeter
                </Button>
                <Button onClick={onValidate}>Valider</Button>
              </div>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
