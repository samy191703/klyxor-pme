import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export default function TerminationDialog({
  open,
  onOpenChange,
  contract,
  onSubmit,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>TerminationDialog</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600">
          TODO: implement TerminationDialog form.
        </div>
      </DialogContent>
    </Dialog>
  );
}
