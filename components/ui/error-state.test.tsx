// The client-side counterpart of the route error boundary — the component that makes a
// failed load look like a failure instead of an empty screen (the anti-silent-empty rule).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState", () => {
  it("renders the default title and a custom message", () => {
    render(<ErrorState message="Knowledge search is unreachable." />);
    expect(screen.getByText("Couldn't load this")).toBeInTheDocument();
    expect(screen.getByText("Knowledge search is unreachable.")).toBeInTheDocument();
  });

  it("fires the retry callback", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
