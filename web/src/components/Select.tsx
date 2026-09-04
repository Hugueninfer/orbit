import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

type Option = { value: string; label: ReactNode; disabled: boolean };
type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size"
>;

function optionText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? optionText(child.props.children)
        : String(child),
    )
    .join("");
}

function collectOptions(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        value?: string | number;
        label?: string;
        disabled?: boolean;
      }>(child)
    )
      return [];
    if (child.type === Fragment || child.type === "optgroup") {
      return collectOptions(
        child.props.children,
        disabled || !!child.props.disabled,
      );
    }
    if (child.type !== "option") return [];
    return [
      {
        value: String(child.props.value ?? optionText(child.props.children)),
        label: child.props.label ?? child.props.children,
        disabled: disabled || !!child.props.disabled,
      },
    ];
  });
}

/** Single-select adapter: the popup is Radix; the invisible select owns native form semantics. */
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  form,
  autoComplete,
  onInvalid,
  className = "",
  id,
  ...triggerProps
}: SelectProps) {
  const options = collectOptions(children);
  const initialValue = String(
    defaultValue ?? options.find((option) => !option.disabled)?.value ?? "",
  );
  const [localValue, setLocalValue] = useState(initialValue);
  const selectedValue = String(value ?? localValue);
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue,
  );
  const nativeValue = selectedIndex < 0 ? "" : selectedValue;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const generatedId = useId();
  const [labelId, setLabelId] = useState<string>();
  const [invalid, setInvalid] = useState(false);

  useLayoutEffect(() => {
    // Existing Field wraps its child in a label. Reference only its caption,
    // so the accessible name does not also contain every option's text.
    const label = triggerRef.current?.closest("label");
    const caption = label?.querySelector(":scope > span");
    if (
      caption &&
      !triggerProps["aria-label"] &&
      !triggerProps["aria-labelledby"]
    ) {
      if (!caption.id) caption.id = `${generatedId}-label`;
      if (labelId !== caption.id) setLabelId(caption.id);
    }
  });

  useEffect(() => {
    const element = nativeRef.current;
    const reset = () => {
      setLocalValue(initialValue);
      setInvalid(false);
    };
    element?.form?.addEventListener("reset", reset);
    return () => element?.form?.removeEventListener("reset", reset);
  }, [initialValue, form]);

  return (
    <>
      <SelectPrimitive.Root
        value={selectedIndex < 0 ? "" : `option-${selectedIndex}`}
        disabled={disabled}
        onValueChange={(encoded) => {
          const option = options[Number(encoded.slice(7))];
          const element = nativeRef.current;
          if (
            !option ||
            !element ||
            option.disabled ||
            option.value === nativeValue
          )
            return;
          // Dispatch a real select change: consumers keep event.target.value,
          // currentTarget/name and normal form bubbling instead of a fake event.
          element.value = option.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }}
      >
        <SelectPrimitive.Trigger
          {...(triggerProps as unknown as ButtonHTMLAttributes<HTMLButtonElement>)}
          ref={triggerRef}
          id={id}
          className={`orbit-select-trigger ${className}`}
          aria-labelledby={triggerProps["aria-labelledby"] ?? labelId}
          aria-required={required || undefined}
          aria-invalid={triggerProps["aria-invalid"] ?? (invalid || undefined)}
        >
          <SelectPrimitive.Value placeholder=" ">
            {options[selectedIndex]?.label}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="orbit-select-chevron">
            <ChevronDown size={16} aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="orbit-select-content">
            <SelectPrimitive.ScrollUpButton className="orbit-select-scroll">
              <ChevronUp size={16} aria-hidden />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="orbit-select-viewport">
              {options.map((option, index) => (
                <SelectPrimitive.Item
                  key={`${index}-${option.value}`}
                  value={`option-${index}`}
                  disabled={option.disabled}
                  className="orbit-select-option"
                  textValue={optionText(option.label)}
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="orbit-select-check">
                    <Check size={16} aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="orbit-select-scroll">
              <ChevronDown size={16} aria-hidden />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      <select
        ref={nativeRef}
        className="orbit-select-native"
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        form={form}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        value={nativeValue}
        onFocus={() => triggerRef.current?.focus()}
        onInvalid={(event) => {
          onInvalid?.(event);
          if (!event.defaultPrevented) {
            event.preventDefault();
            setInvalid(true);
            triggerRef.current?.focus();
          }
        }}
        onChange={(event) => {
          setLocalValue(event.currentTarget.value);
          setInvalid(false);
          onChange?.(event);
        }}
      >
        {!options.some((option) => option.value === "") && <option value="" />}
        {options.map((option, index) => (
          <option
            key={`${index}-${option.value}`}
            value={option.value}
            disabled={option.disabled}
          >
            {optionText(option.label)}
          </option>
        ))}
      </select>
    </>
  );
}
