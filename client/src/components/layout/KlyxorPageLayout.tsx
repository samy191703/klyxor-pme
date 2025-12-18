import type { ReactNode } from "react";
import { PageHeaderKlyxor } from "@/components/layout/PageHeaderKlyxor";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Layout de page Klyxor (stable)
 * - children = ReactNode (compatible avec toutes les pages)
 */
export function KlyxorPageLayout({ title, subtitle, actions, children }: Props) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="pb-4">
        <PageHeaderKlyxor title={title} subtitle={subtitle} actions={actions} />
      </div>

      <div className="min-h-0">{children}</div>
    </div>
  );
}
