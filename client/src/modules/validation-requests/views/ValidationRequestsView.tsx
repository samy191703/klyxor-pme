"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import TextField from "@mui/material/TextField";
import ValidationRequestsTable from "../components/ValidationRequestsTable";
import CreateValidationRequestDialog from "../components/CreateValidationRequestDialog";
import ViewValidationRequestDialog from "../components/ViewValidationRequestDialog";
import {
  useSearchValidationRequests,
  useGetValidationRequest,
  useApproveValidationRequest,
  useRejectValidationRequest,
  useRedirectValidationRequest,
} from "../queries/hooks";

export default function ValidationRequestsView() {
  const [filters, setFilters] = React.useState({
    q: "",
    status: "",
    assignedTo: "",
    page: 1,
    limit: 20,
  });
  const { data, isLoading } = useSearchValidationRequests(filters as any);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openView, setOpenView] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | undefined>(
    undefined
  );
  const one = useGetValidationRequest(selectedId);
  const approve = useApproveValidationRequest(selectedId || "");
  const reject = useRejectValidationRequest(selectedId || "");
  const redirect = useRedirectValidationRequest(selectedId || "");

  const rows = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <TextField
          size="small"
          label="Recherche"
          value={filters.q}
          onChange={(e) =>
            setFilters({ ...filters, q: e.target.value, page: 1 })
          }
        />
        <TextField
          size="small"
          label="Statut"
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value, page: 1 })
          }
        />
        <TextField
          size="small"
          label="Assignée à"
          value={filters.assignedTo}
          onChange={(e) =>
            setFilters({ ...filters, assignedTo: e.target.value, page: 1 })
          }
        />
        <div className="flex-1" />
        <Button onClick={() => setOpenCreate(true)}>Nouvelle demande</Button>
      </div>

      <ValidationRequestsTable
        rows={rows}
        onView={(vr) => {
          setSelectedId(vr.id);
          setOpenView(true);
        }}
        onApprove={(vr) => {
          setSelectedId(vr.id);
          approve.mutate(undefined);
        }}
        onReject={(vr) => {
          setSelectedId(vr.id);
          reject.mutate(undefined);
        }}
        onRedirect={(vr) => {
          setSelectedId(vr.id);
          redirect.mutate({ assignedTo: "" });
        }}
      />

      <CreateValidationRequestDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
      />
      <ViewValidationRequestDialog
        open={openView}
        onClose={() => setOpenView(false)}
        data={one.data || null}
        onApprove={() => approve.mutate(undefined)}
        onReject={() => reject.mutate(undefined)}
        onRedirect={() => redirect.mutate({ assignedTo: "" })}
      />
    </div>
  );
}
