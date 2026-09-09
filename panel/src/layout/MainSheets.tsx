import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ServerSidebar } from "./ServerSidebar/ServerSidebar";
import { useGlobalMenuSheet, usePlayerlistSheet, useServerSheet } from "@/hooks/sheets";
import { MenuNavLink, NavLink } from "@/components/MainPageLink";
import { ClipboardCheckIcon, DoorOpenIcon, ListIcon, PieChartIcon, ScrollIcon, SettingsIcon, UserSquare2Icon, UsersIcon, ZapIcon } from 'lucide-react';
import { PlayerlistSidebar } from "./PlayerlistSidebar/PlayerlistSidebar";
import { useAdminPerms } from "@/hooks/auth";
import { DiamondCircleLogo } from "@/components/Logos";


export function GlobalMenuSheet() {
    const { isSheetOpen, setIsSheetOpen } = useGlobalMenuSheet();
    const { hasPerm } = useAdminPerms();

    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent
                side='left'
                className="p-0 flex flex-col gap-0 w-full xs:w-3/4 select-none"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <ScrollArea className="h-full px-6 [&_svg]:shrink-0">
                    <SheetHeader>
                        <SheetTitle className="py-6">
                            <NavLink href="/">
                                <div className="flex items-center gap-3">
                                    <DiamondCircleLogo className="h-10 w-10 hover:scale-105 transition-transform" />
                                    <span className="flex flex-col leading-none text-left font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2ec7ff] via-[#f43cb2] to-[#f3d36b]">
                                        <span className="text-xl">DiamondCrew</span>
                                        <span className="text-sm">Interactive</span>
                                    </span>
                                </div>
                            </NavLink>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mb-4">
                        <h2 className="mb-1.5 text-lg font-semibold tracking-tight">
                            Global Menu
                        </h2>
                        <div className="flex flex-wrap flex-row xs:grid grid-cols-2 gap-4">
                            <MenuNavLink href="/players">
                                <UsersIcon className="mr-2 h-4 w-4" />Players
                            </MenuNavLink>
                            <MenuNavLink href="/history">
                                <ScrollIcon className="mr-2 h-4 w-4" />History
                            </MenuNavLink>
                            <MenuNavLink href="/insights/player-drops">
                                <DoorOpenIcon className="mr-2 h-4 w-4" />Player Drops
                            </MenuNavLink>
                            <MenuNavLink href="/allowlist">
                                <ClipboardCheckIcon className="mr-2 h-4 w-4" />Allowlist
                            </MenuNavLink>
                            <MenuNavLink href="/admins" disabled={!hasPerm('manage.admins')}>
                                <UserSquare2Icon className="mr-2 h-4 w-4" />Admins
                            </MenuNavLink>
                            <MenuNavLink href="/settings" disabled={!hasPerm('settings.view')}>
                                <SettingsIcon className="mr-2 h-4 w-4" />Settings
                            </MenuNavLink>
                        </div>
                    </div>
                    <div className="mb-4">
                        <h2 className="mb-1.5 text-lg font-semibold tracking-tight">
                            System Menu
                        </h2>
                        <div className="flex flex-wrap flex-row xs:grid grid-cols-2 gap-4">
                            <MenuNavLink href="/system/master-actions">
                                <ZapIcon className="mr-2 h-4 w-4" />Master Actions
                            </MenuNavLink>
                            <MenuNavLink href="/system/diagnostics">
                                <PieChartIcon className="mr-2 h-4 w-4" />Diagnostics
                            </MenuNavLink>
                            <MenuNavLink href="/system/console-log" disabled={!hasPerm('txadmin.log.view')}>
                                <ListIcon className="mr-2 h-4 w-4" />Console Log
                            </MenuNavLink>
                            <MenuNavLink href="/system/action-log" disabled={!hasPerm('txadmin.log.view')}>
                                <ListIcon className="mr-2 h-4 w-4" />Action Log
                            </MenuNavLink>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

export function ServerSidebarSheet() {
    const { isSheetOpen, setIsSheetOpen } = useServerSheet();
    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent
                side='left'
                className="w-full xs:w-3/4 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <ScrollArea className="h-full">
                    <ServerSidebar isSheet />
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

export function PlayersSidebarSheet() {
    const { isSheetOpen, setIsSheetOpen } = usePlayerlistSheet();
    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent
                side='right'
                className="w-full xs:w-3/4 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <ScrollArea className="h-full">
                    <PlayerlistSidebar isSheet />
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

export default function MainSheets() {
    return <>
        <GlobalMenuSheet />
        <ServerSidebarSheet />
        <PlayersSidebarSheet />
    </>;
}
