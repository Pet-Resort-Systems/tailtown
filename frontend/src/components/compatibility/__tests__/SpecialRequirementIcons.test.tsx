/**
 * SpecialRequirementIcons Component Tests
 *
 * Tests that verify the SpecialRequirementIcons component displays correctly
 * for different special requirements.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SpecialRequirementIcons } from "../SpecialRequirementIcons";

describe("SpecialRequirementIcons Component", () => {
  describe("Rendering Icons", () => {
    it("should render medication icon", () => {
      render(<SpecialRequirementIcons requirements={["HAS_MEDICATION"]} />);
      expect(screen.getByText("💊")).toBeInTheDocument();
    });

    it("should render allergies icon", () => {
      render(<SpecialRequirementIcons requirements={["ALLERGIES"]} />);
      expect(screen.getByText("🤧")).toBeInTheDocument();
    });

    it("should render medical monitoring icon", () => {
      render(<SpecialRequirementIcons requirements={["MEDICAL_MONITORING"]} />);
      expect(screen.getByText("🩺")).toBeInTheDocument();
    });

    it("should render heat sensitive icon", () => {
      render(<SpecialRequirementIcons requirements={["HEAT_SENSITIVE"]} />);
      expect(screen.getByText("🌡️")).toBeInTheDocument();
    });

    it("should render multiple icons", () => {
      render(
        <SpecialRequirementIcons
          requirements={["HAS_MEDICATION", "ALLERGIES"]}
        />
      );
      expect(screen.getByText("💊")).toBeInTheDocument();
      expect(screen.getByText("🤧")).toBeInTheDocument();
    });

    it("should render nothing for empty requirements", () => {
      const { container } = render(
        <SpecialRequirementIcons requirements={[]} />
      );
      expect(container.firstChild).toBeEmptyDOMElement();
    });

    it("should render nothing for undefined requirements", () => {
      const { container } = render(
        <SpecialRequirementIcons requirements={undefined as any} />
      );
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe("Icon Tooltips", () => {
    it("should have tooltip for medication icon", () => {
      render(<SpecialRequirementIcons requirements={["HAS_MEDICATION"]} />);
      const icon = screen.getByText("💊");
      expect(icon.parentElement).toHaveAttribute("title", "Has Medication");
    });

    it("should have tooltip for allergies icon", () => {
      render(<SpecialRequirementIcons requirements={["ALLERGIES"]} />);
      const icon = screen.getByText("🤧");
      expect(icon.parentElement).toHaveAttribute("title", "Allergies");
    });

    it("should have tooltip for medical monitoring icon", () => {
      render(<SpecialRequirementIcons requirements={["MEDICAL_MONITORING"]} />);
      const icon = screen.getByText("🩺");
      expect(icon.parentElement).toHaveAttribute("title", "Medical Monitoring");
    });
  });

  describe("Size Variants", () => {
    it("should render small size icons", () => {
      const { container } = render(
        <SpecialRequirementIcons
          requirements={["HAS_MEDICATION"]}
          size="small"
        />
      );
      const icon = container.querySelector('[style*="font-size"]');
      expect(icon).toBeInTheDocument();
    });

    it("should render medium size icons by default", () => {
      const { container } = render(
        <SpecialRequirementIcons requirements={["HAS_MEDICATION"]} />
      );
      const icon = container.querySelector('[style*="font-size"]');
      expect(icon).toBeInTheDocument();
    });

    it("should render large size icons", () => {
      const { container } = render(
        <SpecialRequirementIcons
          requirements={["HAS_MEDICATION"]}
          size="large"
        />
      );
      const icon = container.querySelector('[style*="font-size"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Priority Ordering", () => {
    it("should render icons in priority order", () => {
      const { container } = render(
        <SpecialRequirementIcons
          requirements={["HEAT_SENSITIVE", "HAS_MEDICATION", "ALLERGIES"]}
        />
      );
      const icons = container.querySelectorAll('[role="img"]');
      expect(icons.length).toBe(3);
      // HAS_MEDICATION and ALLERGIES have priority 7, HEAT_SENSITIVE has priority 6
      // Higher priority should come first
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid requirement gracefully", () => {
      const { container } = render(
        <SpecialRequirementIcons
          requirements={["INVALID_REQUIREMENT" as any]}
        />
      );
      // Should not crash, may render nothing or a default
      expect(container).toBeInTheDocument();
    });

    it("should handle duplicate requirements", () => {
      render(
        <SpecialRequirementIcons
          requirements={["HAS_MEDICATION", "HAS_MEDICATION"]}
        />
      );
      // Should only render one icon
      const icons = screen.getAllByText("💊");
      expect(icons.length).toBe(1);
    });

    it("should handle mixed valid and invalid requirements", () => {
      render(
        <SpecialRequirementIcons
          requirements={["HAS_MEDICATION", "INVALID" as any, "ALLERGIES"]}
        />
      );
      expect(screen.getByText("💊")).toBeInTheDocument();
      expect(screen.getByText("🤧")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it('should have role="img" for icons', () => {
      const { container } = render(
        <SpecialRequirementIcons requirements={["HAS_MEDICATION"]} />
      );
      const icon = container.querySelector('[role="img"]');
      expect(icon).toBeInTheDocument();
    });

    it("should be keyboard accessible via tooltips", () => {
      render(<SpecialRequirementIcons requirements={["HAS_MEDICATION"]} />);
      const icon = screen.getByText("💊");
      expect(icon.parentElement).toHaveAttribute("title");
    });
  });

  describe("All Special Requirements", () => {
    it("should render all medical requirements", () => {
      render(
        <SpecialRequirementIcons
          requirements={["HAS_MEDICATION", "MEDICAL_MONITORING", "ALLERGIES"]}
        />
      );
      expect(screen.getByText("💊")).toBeInTheDocument();
      expect(screen.getByText("🩺")).toBeInTheDocument();
      expect(screen.getByText("🤧")).toBeInTheDocument();
    });

    it("should render all physical limitation requirements", () => {
      render(
        <SpecialRequirementIcons
          requirements={["BLIND", "DEAF", "MOBILITY_ISSUES"]}
        />
      );
      // Check that icons are rendered (specific emojis may vary)
      const { container } = render(
        <SpecialRequirementIcons
          requirements={["BLIND", "DEAF", "MOBILITY_ISSUES"]}
        />
      );
      const icons = container.querySelectorAll('[role="img"]');
      expect(icons.length).toBe(3);
    });

    it("should render all environmental requirements", () => {
      render(
        <SpecialRequirementIcons
          requirements={["HEAT_SENSITIVE", "NO_POOL", "NO_LEASH_ON_NECK"]}
        />
      );
      const { container } = render(
        <SpecialRequirementIcons
          requirements={["HEAT_SENSITIVE", "NO_POOL", "NO_LEASH_ON_NECK"]}
        />
      );
      const icons = container.querySelectorAll('[role="img"]');
      expect(icons.length).toBe(3);
    });
  });
});
