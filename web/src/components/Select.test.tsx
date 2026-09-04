import { useState } from "react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Select } from "./Select";
import { Drawer, Field } from "./ui";

beforeAll(() => {
  // jsdom has no layout/pointer capture; leave interaction and focus to Radix.
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(cleanup);

async function open(label: string) {
  const trigger = screen.getByRole("combobox", { name: label });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await screen.findByRole("listbox");
  return trigger;
}

test("wrapped Field names the control and controlled choices preserve empty/string/numeric values", async () => {
  const changed = vi.fn();
  function Example() {
    const [value, setValue] = useState<string | number>(0);
    return (
      <form aria-label="Preferences">
        <Field label="First day">
          <Select
            name="week_start"
            value={value}
            onChange={(event) => {
              changed(event.target.value);
              setValue(event.target.value);
            }}
          >
            <option value="">No preference</option>
            <option value={0}>Monday</option>
            <option value={6}>Sunday</option>
          </Select>
        </Field>
      </form>
    );
  }
  render(<Example />);
  const trigger = screen.getByRole("combobox", { name: "First day" });
  expect(trigger.textContent).toContain("Monday");
  expect(changed).not.toHaveBeenCalled();
  await open("First day");
  fireEvent.click(screen.getByRole("option", { name: "Sunday" }));
  await waitFor(() => expect(trigger.textContent).toContain("Sunday"));
  expect(changed).toHaveBeenLastCalledWith("6");
  await open("First day");
  fireEvent.click(screen.getByRole("option", { name: "No preference" }));
  await waitFor(() => expect(trigger.textContent).toContain("No preference"));
  expect(changed).toHaveBeenLastCalledWith("");
  expect(
    new FormData(screen.getByRole("form") as HTMLFormElement).get("week_start"),
  ).toBe("");
});

test("required form validation blocks an empty choice and focuses the visible control", async () => {
  function Example() {
    const [value, setValue] = useState("");
    return (
      <form aria-label="Expense">
        <Field label="Account">
          <Select
            name="account"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="">Choose account</option>
            <option value="bank">Main account</option>
          </Select>
        </Field>
        <button>Save</button>
      </form>
    );
  }
  render(<Example />);
  const form = screen.getByRole("form") as HTMLFormElement;
  act(() => {
    expect(form.checkValidity()).toBe(false);
  });
  expect(document.activeElement).toBe(
    screen.getByRole("combobox", { name: "Account" }),
  );
  await open("Account");
  fireEvent.click(screen.getByRole("option", { name: "Main account" }));
  await waitFor(() => expect(form.checkValidity()).toBe(true));
  expect(new FormData(form).get("account")).toBe("bank");
  await open("Account");
  fireEvent.click(screen.getByRole("option", { name: "Choose account" }));
  await waitFor(() => expect(form.checkValidity()).toBe(false));
});

test("disabled select cannot open and is excluded from required validation and FormData", () => {
  render(
    <form aria-label="Settings">
      <Select name="currency" aria-label="Currency" required disabled value="">
        <option value="">Choose</option>
        <option value="BRL">BRL</option>
      </Select>
    </form>,
  );
  const trigger = screen.getByRole("combobox", { name: "Currency" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.click(trigger);
  expect(screen.queryByRole("listbox")).toBeNull();
  const form = screen.getByRole("form") as HTMLFormElement;
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).has("currency")).toBe(false);
});

test("keyboard Home/End/arrows skip disabled choices and Escape preserves selection", async () => {
  const changed = vi.fn();
  render(
    <Select
      aria-label="Category"
      defaultValue="a"
      onChange={(e) => changed(e.target.value)}
    >
      <option value="a">Alpha</option>
      <option value="b" disabled>
        Beta
      </option>
      <option value="c">Charlie</option>
    </Select>,
  );
  const trigger = await open("Category");
  fireEvent.keyDown(document.activeElement!, { key: "End" });
  await waitFor(() =>
    expect(document.activeElement?.textContent).toContain("Charlie"),
  );
  fireEvent.keyDown(document.activeElement!, { key: "Home" });
  await waitFor(() =>
    expect(document.activeElement?.textContent).toContain("Alpha"),
  );
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  await waitFor(() =>
    expect(document.activeElement?.textContent).toContain("Charlie"),
  );
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  expect(trigger.textContent).toContain("Alpha");
  expect(changed).not.toHaveBeenCalled();
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  await open("Category");
  fireEvent.keyDown(document.activeElement!, { key: "c" });
  await waitFor(() =>
    expect(document.activeElement?.textContent).toContain("Charlie"),
  );
  fireEvent.keyDown(document.activeElement!, { key: "Enter" });
  await waitFor(() => expect(changed).toHaveBeenLastCalledWith("c"));
});

test("select popup inside Drawer closes without closing the dialog and returns focus", async () => {
  const close = vi.fn();
  render(
    <Drawer title="New expense" open onClose={close}>
      <Field label="Account">
        <Select defaultValue="a">
          <option value="a">Bank A</option>
          <option value="b">Bank B</option>
        </Select>
      </Field>
      <button>Continue</button>
    </Drawer>,
  );
  const trigger = await open("Account");
  fireEvent.click(screen.getByRole("option", { name: "Bank B" }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  expect(screen.getByRole("dialog", { name: "New expense" })).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  await open("Account");
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  expect(close).not.toHaveBeenCalled();
  screen.getByRole("button", { name: "Continue" }).focus();
  expect(document.activeElement?.textContent).toBe("Continue");
});

test("uncontrolled reset restores initial value and implicit option values stay unchanged", async () => {
  render(
    <form aria-label="Tags">
      <Select name="tag" aria-label="Tag" defaultValue="Food">
        <option>Food</option>
        <option>Travel</option>
      </Select>
    </form>,
  );
  const trigger = await open("Tag");
  fireEvent.click(screen.getByRole("option", { name: "Travel" }));
  await waitFor(() => expect(trigger.textContent).toContain("Travel"));
  const form = screen.getByRole("form") as HTMLFormElement;
  fireEvent.reset(form);
  await waitFor(() => expect(trigger.textContent).toContain("Food"));
  expect(new FormData(form).get("tag")).toBe("Food");
});
