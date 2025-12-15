import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export default function ContractValidationDialog({
  open,
  onOpenChange,
  contract,
  onSubmit,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ValidationDialog</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600">
          TODO: implement ValidationDialog form.
        </div>
      </DialogContent>
    </Dialog>
  );
}
