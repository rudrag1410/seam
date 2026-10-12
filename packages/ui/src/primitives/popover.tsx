"use client";

import * as P from "@radix-ui/react-popover";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-80 rounded-[16px] bg-bg p-4 text-sm shadow-[var(--shadow-pop)] outline-none animate-fade-in",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}
