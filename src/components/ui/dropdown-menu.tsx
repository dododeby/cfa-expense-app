"use client"

import * as React from "react"
import * as DropdownMenuPrim from "@radix-ui/react-dropdown-menu"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrim.Root

const DropdownMenuTrigger = DropdownMenuPrim.Trigger

const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrim.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrim.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <DropdownMenuPrim.Portal>
        <DropdownMenuPrim.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-slate-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
            )}
            {...props}
        />
    </DropdownMenuPrim.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrim.Content.displayName

const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrim.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrim.Item> & {
        inset?: boolean
    }
>(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrim.Item
        ref={ref}
        className={cn(
            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            inset && "pl-8",
            className
        )}
        {...props}
    />
))
DropdownMenuItem.displayName = DropdownMenuPrim.Item.displayName

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
}
