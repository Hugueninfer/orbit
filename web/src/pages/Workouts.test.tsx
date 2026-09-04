import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setLocale } from "../i18n";
import Workouts from "./Workouts";

const action = vi.fn().mockResolvedValue({});

vi.mock("../api", () => ({
  useApi: (path: string) => ({
    data:
      path === "/me"
        ? { weight_unit: "kg" }
        : path === "/sessions/active"
          ? null
          : [],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useActions: () => action,
}));
vi.mock("../components/Select", () => ({
  Select: (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} />
  ),
}));

afterEach(() => {
  cleanup();
  action.mockClear();
  setLocale("pt-BR");
});

test.each([
  ["en-US", "New exercise", "Save exercise"],
  ["de-DE", "Neue Übung", "Übung speichern"],
] as const)(
  "exercise editor keeps Portuguese muscle-group values in %s",
  async (locale, newExercise, saveExercise) => {
    setLocale(locale);
    render(
      <MemoryRouter>
        <Workouts />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: newExercise }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Bench press" },
    });
    const group = screen.getByLabelText(
      locale === "en-US" ? "Muscle group" : "Muskelgruppe",
    ) as HTMLSelectElement;
    expect(group.value).toBe("Peito");
    fireEvent.click(screen.getByRole("button", { name: saveExercise }));

    await waitFor(() =>
      expect(action).toHaveBeenCalledWith(
        "/exercises",
        expect.objectContaining({ name: "Bench press", muscle_group: "Peito" }),
      ),
    );
  },
);
