import React from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

type FormPanelProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  actions?: React.ReactNode;
};

export function FormPanel({ title, description, children, aside, actions }: FormPanelProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />
      <div className={`grid gap-6 ${aside ? "lg:grid-cols-3" : "grid-cols-1"}`}>
        <div className={aside ? "lg:col-span-2" : "w-full max-w-3xl"}>
          <Card className="bg-white">
            <CardContent className="p-6 md:p-8">{children}</CardContent>
          </Card>
        </div>
        {aside && <div className="space-y-6 lg:col-span-1">{aside}</div>}
      </div>
    </div>
  );
}
