import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FormSection from "./FormSection";

describe("FormSection", () => {
  it("renders label text", () => {
    render(
      <FormSection label="Name">
        <input />
      </FormSection>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders kbd hint when provided", () => {
    render(
      <FormSection label="Type" kbd="auto-derived">
        <input />
      </FormSection>,
    );
    expect(screen.getByText("auto-derived")).toBeInTheDocument();
  });

  it("does not render kbd when omitted", () => {
    const { container } = render(
      <FormSection label="Type">
        <input />
      </FormSection>,
    );
    expect(container.querySelector("span")).not.toBeInTheDocument();
  });

  it("renders action slot when provided", () => {
    render(
      <FormSection label="Name" action={<button>reset</button>}>
        <input />
      </FormSection>,
    );
    expect(screen.getByRole("button", { name: "reset" })).toBeInTheDocument();
  });

  it("renders children in content area", () => {
    render(
      <FormSection label="Name">
        <input aria-label="test-input" />
      </FormSection>,
    );
    expect(screen.getByLabelText("test-input")).toBeInTheDocument();
  });
});
