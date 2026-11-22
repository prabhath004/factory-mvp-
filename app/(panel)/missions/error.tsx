"use client";

import { Button } from "@/components/ui/button";

export default function MissionsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="m-auto max-w-md p-6 text-center"><h2 className="text-lg font-semibold">Mission data could not be loaded</h2><p className="mt-2 text-sm text-muted-foreground">Check the database and runner connection, then try again.</p><Button className="mt-4" onClick={reset}>Try again</Button></div>;
}
