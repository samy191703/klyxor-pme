"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import TextField from "@mui/material/TextField";

import type { ValidationRequest } from "../domain/types";
import { VALIDATION_STATUS_LABEL } from "../domain/types";
import { formatDateFR } from "../utils/formatters";

// Visual style per status (tweak to your design)
const STATUS_VARIANT: Record<
  ValidationRequest["status"],
  {
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    tone?: string;
  }
> = {
  pending: { badgeVariant: "secondary", tone: "text-amber-700" },
  approved: { badgeVariant: "default", tone: "text-green-700" },
  rejected: { badgeVariant: "destructive", tone: "text-red-700" },
  redirected: { badgeVariant: "outline", tone: "text-blue-700" },
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: ValidationRequest | null;

  onApprove: () => void;
  onReject: () => void;
  onRedirect: () => void;

  /** Optional: capture live changes of the reason text */
  onChangeReason?: (reason: string) => void;

  /** Optional: wire loading states from react-query hooks */
  loadingApprove?: boolean;
  loadingReject?: boolean;
  loadingRedirect?: boolean;
};

export default function ViewValidationRequestDialog({
  open,
  onClose,
  data,
  onApprove,
  onReject,
  onRedirect,
  onChangeReason,
  loadingApprove,
  loadingReject,
  loadingRedirect,
}: Props) {
  if (!data) return null;

  const statusLook = STATUS_VARIANT[data.status] ?? {
    badgeVariant: "secondary",
  };

  // Keep a local editable "reason" (multi-row). Initialize from data.reason.
  const [reason, setReason] = useState<string>(data.reason ?? "");

  useEffect(() => {
    // refresh when switching items
    setReason(data.reason ?? "");
  }, [data.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createdAt = useMemo(
    () => formatDateFR(data.createdAt),
    [data.createdAt]
  );
  const updatedAt = useMemo(
    () => (data.updatedAt ? formatDateFR(data.updatedAt) : "—"),
    [data.updatedAt]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Demande de validation</span>
            <Badge variant={statusLook.badgeVariant}>
              {VALIDATION_STATUS_LABEL[data.status] ?? data.status}
            </Badge>
          </DialogTitle>

          <DialogDescription className="mt-1">
            Référence&nbsp;
            <span className="font-medium">{data.reference ?? "—"}</span>
            &nbsp;• créée le {createdAt}
            {/* {data.updatedAt && <> — dernière mise à jour : {updatedAt}</>} */}
          </DialogDescription>
        </DialogHeader>

        {/* Core info */}
        <div className="space-y-1">
          {/* Subject & References — aligned with schema */}
          <section className="space-y-2">
            <h3 className="font-medium">Sujet & Références</h3>
            <Card>
              <CardContent className="p-4 text-sm space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center justify-start gap-5">
                    <div className="text-gray-600">Référence</div>
                    <div className="font-medium">{data.reference ?? "—"}</div>
                  </div>
                  <div className="flex items-center justify-end gap-5">
                    <div className="text-gray-600">Type</div>
                    <div className="font-medium">{data.type ?? "—"}</div>
                  </div>
                </div>

                {/* <div className="flex items-center justify-between">
                  <div className="text-gray-600">ID de référence</div>
                  <div className="font-medium">{data.referenceId ?? "—"}</div>
                </div> */}

                <div>
                  <div className="text-gray-600">Sujet</div>
                  <div className="mt-1 p-2 bg-muted rounded">
                    {data.subject || "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Routing / Assignment — aligned with schema */}
          <section className="space-y-1">
            <h3 className="font-medium">Routage & Affectation</h3>
            <Card>
              <CardContent className="p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-gray-600">Demandée par (userId)</div>
                  <div className="font-medium">{data.requestedBy ?? "—"}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-600">Assignée à (userId)</div>
                  <div className="font-medium">{data.assignedTo ?? "—"}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">Âge (jours)</div>
                    <div className="font-medium">{data.age ?? 0}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">Validée par</div>
                    <div className="font-medium">{data.validatedBy ?? "—"}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">Date de validation</div>
                    <div className="font-medium">
                      {data.validatedAt ? formatDateFR(data.validatedAt) : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Reason (editable, 3 rows) */}
          <section className="space-y-1">
            <h3 className="font-medium">Justification</h3>
            <Card>
              <CardContent className="p-4">
                <TextField
                  id="validation-reason"
                  label="Motif (obligatoire pour Rejet / utile pour Redirection)"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    onChangeReason?.(e.target.value);
                  }}
                  fullWidth
                  multiline
                  minRows={3}
                  InputLabelProps={{ shrink: true }}
                />
              </CardContent>
            </Card>
            <Alert>
              <AlertDescription>
                Le <b>motif</b> est enregistré dans{" "}
                <code>validation_requests.reason</code>. Requis pour le{" "}
                <i>Rejet</i>, optionnel pour la <i>Redirection</i>.
              </AlertDescription>
            </Alert>
          </section>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="justify-between">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onRedirect}
              title="Rediriger vers un autre valideur"
              disabled={!!loadingRedirect}
            >
              {loadingRedirect ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirection…
                </>
              ) : (
                "Rediriger"
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              title="Rejeter la demande"
              disabled={!!loadingReject}
            >
              {loadingReject ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejet…
                </>
              ) : (
                "Rejeter"
              )}
            </Button>
            <Button
              onClick={onApprove}
              title="Approuver la demande"
              disabled={!!loadingApprove}
            >
              {loadingApprove ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approbation…
                </>
              ) : (
                "Approuver"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
