import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Branded 404 for unmatched routes. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
        <Compass className="h-6 w-6" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline">Back to home</Button>
      </Link>
    </div>
  );
}
