"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface ParsedGroup {
  label?: string;
  options: CustomSelectOption[];
}

export interface CustomSelectProps {
  value: string;
  onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
  onValueChange?: (value: string) => void;
  options?: CustomSelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  title?: string;
  leftIcon?: React.ReactNode;
  searchable?: boolean;
  align?: "left" | "right";
}

function parseChildrenToGroups(children: React.ReactNode): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  let defaultGroup: ParsedGroup = { options: [] };

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    const type = child.type;
    const props = child.props as Record<string, any>;

    if (type === "option") {
      const val = props.value !== undefined ? String(props.value) : String(props.children ?? "");
      const label = flattenText(props.children);
      defaultGroup.options.push({
        value: val,
        label,
        disabled: Boolean(props.disabled),
      });
    } else if (type === "optgroup") {
      if (defaultGroup.options.length > 0) {
        groups.push(defaultGroup);
        defaultGroup = { options: [] };
      }
      const groupLabel = String(props.label ?? "");
      const groupOptions: CustomSelectOption[] = [];
      React.Children.forEach(props.children, (optChild) => {
        if (!React.isValidElement(optChild)) return;
        if (optChild.type === "option") {
          const optProps = optChild.props as Record<string, any>;
          const val =
            optProps.value !== undefined
              ? String(optProps.value)
              : String(optProps.children ?? "");
          groupOptions.push({
            value: val,
            label: flattenText(optProps.children),
            disabled: Boolean(optProps.disabled),
            group: groupLabel,
          });
        }
      });
      if (groupOptions.length > 0) {
        groups.push({ label: groupLabel, options: groupOptions });
      }
    } else if (type === React.Fragment && props.children) {
      const nested = parseChildrenToGroups(props.children);
      nested.forEach((g) => {
        if (!g.label) {
          defaultGroup.options.push(...g.options);
        } else {
          if (defaultGroup.options.length > 0) {
            groups.push(defaultGroup);
            defaultGroup = { options: [] };
          }
          groups.push(g);
        }
      });
    }
  });

  if (defaultGroup.options.length > 0) {
    groups.push(defaultGroup);
  }

  return groups;
}

function flattenText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (React.isValidElement(node)) {
    return flattenText((node.props as Record<string, any>).children);
  }
  return "";
}

export default function CustomSelect({
  value,
  onChange,
  onValueChange,
  options,
  children,
  placeholder = "Pilih opsi...",
  disabled = false,
  className = "",
  menuClassName = "",
  title,
  leftIcon,
  searchable,
  align = "left",
}: CustomSelectProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
    openUpward: boolean;
    maxHeight: number;
  }>({
    top: 0,
    bottom: 0,
    left: 0,
    width: 240,
    openUpward: false,
    maxHeight: 280,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groups = useMemo<ParsedGroup[]>(() => {
    if (options && options.length > 0) {
      const map = new Map<string, CustomSelectOption[]>();
      const ungrouped: CustomSelectOption[] = [];
      for (const opt of options) {
        if (opt.group) {
          const list = map.get(opt.group) || [];
          list.push(opt);
          map.set(opt.group, list);
        } else {
          ungrouped.push(opt);
        }
      }
      const res: ParsedGroup[] = [];
      if (ungrouped.length > 0) res.push({ options: ungrouped });
      map.forEach((opts, label) => res.push({ label, options: opts }));
      return res;
    }
    return parseChildrenToGroups(children);
  }, [options, children]);

  const flatOptions = useMemo(
    () => groups.flatMap((g) => g.options),
    [groups]
  );

  const showSearch = searchable ?? flatOptions.length >= 8;

  const filteredGroups = useMemo<ParsedGroup[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        label: g.label,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            (g.label && g.label.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, search]);

  const enabledFilteredOptions = useMemo(
    () => filteredGroups.flatMap((g) => g.options).filter((o) => !o.disabled),
    [filteredGroups]
  );

  const selectedOption = useMemo(
    () => flatOptions.find((o) => o.value === value) ?? flatOptions[0],
    [flatOptions, value]
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const spaceBelow = viewportH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const desiredHeight = Math.min(
      320,
      flatOptions.length * 40 + (showSearch ? 56 : 16) + groups.length * 24
    );

    const openUpward = spaceBelow < Math.min(220, desiredHeight) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(320, openUpward ? spaceAbove : spaceBelow));

    const minMenuWidth = Math.max(rect.width, 220);
    let left = align === "right" ? rect.right - minMenuWidth : rect.left;
    if (left + minMenuWidth > viewportW - 12) {
      left = Math.max(12, viewportW - minMenuWidth - 12);
    }
    if (left < 12) left = 12;

    setCoords({
      top: rect.bottom + 6,
      bottom: viewportH - rect.top + 6,
      left,
      width: Math.max(rect.width, minMenuWidth),
      openUpward,
      maxHeight,
    });
  }, [align, flatOptions.length, groups.length, showSearch]);

  const handleSelect = useCallback(
    (val: string) => {
      const syntheticEvent = {
        target: { value: val },
        currentTarget: { value: val },
      };
      onChange?.(syntheticEvent);
      onValueChange?.(val);
      setOpen(false);
      setSearch("");
      triggerRef.current?.focus();
    },
    [onChange, onValueChange]
  );

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const currentIdx = enabledFilteredOptions.findIndex((o) => o.value === value);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);

    if (showSearch) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    const handleScrollOrResize = (e: Event) => {
      if (
        menuRef.current &&
        e.target instanceof Node &&
        menuRef.current.contains(e.target)
      ) {
        return;
      }
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, updatePosition, showSearch, enabledFilteredOptions, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setSearch("");
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (enabledFilteredOptions.length === 0) return;
      setHighlightedIndex((prev) => (prev + 1) % enabledFilteredOptions.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (enabledFilteredOptions.length === 0) return;
      setHighlightedIndex((prev) =>
        prev <= 0 ? enabledFilteredOptions.length - 1 : prev - 1
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const targetOpt = enabledFilteredOptions[highlightedIndex];
      if (targetOpt) {
        handleSelect(targetOpt.value);
      }
    }
  };

  const isPlaceholderSelected = Boolean(
    selectedOption &&
      selectedOption.value === "" &&
      selectedOption.label.trim().startsWith("—")
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
            if (open) setSearch("");
          }
        }}
        onKeyDown={handleKeyDown}
        className={`group relative inline-flex items-center justify-between gap-2 text-left transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${
          open ? "ring-2 ring-blue-500/25 border-blue-500" : "hover:border-blue-400"
        } ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {leftIcon && (
            <span className="flex-shrink-0 text-current opacity-75">{leftIcon}</span>
          )}
          <span
            className={`truncate block ${
              isPlaceholderSelected ? "text-slate-400 font-medium" : ""
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`flex-shrink-0 opacity-60 group-hover:opacity-100 transition-transform duration-200 ${
            open ? "rotate-180 text-blue-600 opacity-100" : ""
          }`}
        />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            onKeyDown={handleKeyDown}
            style={{
              position: "fixed",
              left: coords.left,
              width: coords.width,
              ...(coords.openUpward
                ? { bottom: coords.bottom }
                : { top: coords.top }),
              zIndex: 9999,
            }}
            className={`bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
          >
            {showSearch && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                <div className="relative flex items-center">
                  <Search
                    size={13}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder="Cari pilihan..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>
            )}

            <div
              style={{ maxHeight: coords.maxHeight - (showSearch ? 50 : 0) }}
              className="overflow-y-auto p-1.5 space-y-1"
            >
              {filteredGroups.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                  Tidak ada opsi yang cocok
                </div>
              ) : (
                filteredGroups.map((group, gIdx) => (
                  <div key={group.label ?? `g-${gIdx}`} className="space-y-0.5">
                    {group.label && (
                      <div className="px-2.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                        {group.label}
                      </div>
                    )}
                    {group.options.map((opt) => {
                      const isSelected = opt.value === value;
                      const enabledIdx = enabledFilteredOptions.findIndex(
                        (o) => o.value === opt.value
                      );
                      const isHighlighted = enabledIdx === highlightedIndex;

                      return (
                        <button
                          key={`${group.label ?? ""}-${opt.value}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={opt.disabled}
                          onMouseEnter={() => {
                            if (enabledIdx >= 0) setHighlightedIndex(enabledIdx);
                          }}
                          onClick={() => {
                            if (!opt.disabled) handleSelect(opt.value);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                            opt.disabled
                              ? "opacity-40 cursor-not-allowed text-slate-400"
                              : isSelected
                              ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/20"
                              : isHighlighted
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-700 font-semibold hover:bg-slate-100"
                          }`}
                        >
                          <span className="truncate leading-snug">{opt.label}</span>
                          {isSelected && (
                            <Check
                              size={14}
                              className="flex-shrink-0 text-white"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
