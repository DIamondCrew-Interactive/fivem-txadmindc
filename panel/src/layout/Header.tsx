import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { openExternalLink } from '@/lib/navigation';
import { KeyRoundIcon, LanguagesIcon, LogOutIcon, Menu, Monitor, MoonIcon, PersonStanding, SunIcon } from "lucide-react";
import DesktopNavbar from "./DesktopNavbar";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/hooks/auth";
import { useGlobalMenuSheet, usePlayerlistSheet, useServerSheet } from "@/hooks/sheets";
import { useTheme } from "@/hooks/theme";
import { FaDiscord } from "react-icons/fa";
import { useAtomValue } from "jotai";
import { serverNameAtom } from "@/hooks/status";
import { playerCountAtom } from "@/hooks/playerlist";
import { useAccountModal } from "@/hooks/dialogs";
import { DiamondCircleLogo } from "@/components/Logos";
import { NavLink } from "@/components/MainPageLink";
import { usePanelLocale } from "@/hooks/panelLocale";


function ServerTitle() {
    const playerCount = useAtomValue(playerCountAtom);
    const serverName = useAtomValue(serverNameAtom);

    return (
        <div className="flex justify-start">
            <h1 className="line-clamp-1 text-base break-all">
                {serverName}
            </h1>
            <span>
                :&nbsp;
                <span className="font-mono" title="players connected">{playerCount}</span>
            </span>
        </div>
    );
}


type NavButtonProps = {
    className?: string;
};
const navButtonClasses = `h-11 w-11 sm:h-10 sm:min-w-max sm:px-2 lg:px-3
    flex justify-center items-center gap-2
    transition-all ring-offset-background 
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    rounded-md text-sm border
   
    bg-card/80 hover:bg-secondary border-border/80 backdrop-blur
`;

function ButtonToggleServerSheet({ className }: NavButtonProps) {
    const { setIsSheetOpen } = useServerSheet();
    return (
        <button
            className={cn(navButtonClasses, className)}
            title="Server Menu"
            onClick={() => setIsSheetOpen(true)}
        >
            <Monitor className="h-6 w-6 sm:h-5 sm:w-5" />
            <div className="hidden sm:flex flex-row min-w-max align-middle">
                Server
            </div>
        </button>
    );
}

function ButtonToggleGlobalMenu({ className }: NavButtonProps) {
    const { setIsSheetOpen } = useGlobalMenuSheet();
    return (
        <button
            className={cn(navButtonClasses, className)}
            title="Global Menu"
            onClick={() => setIsSheetOpen(true)}
        >
            <Menu className="h-6 w-6 sm:h-5 sm:w-5" />
            <div className="hidden sm:flex flex-row min-w-max">
                Menu
            </div>
        </button>
    );
}

function ButtonTogglePlayerlistSheet({ className }: NavButtonProps) {
    const { setIsSheetOpen } = usePlayerlistSheet();
    const playerCount = useAtomValue(playerCountAtom);

    return (
        <button
            className={cn(navButtonClasses, className)}
            title="Global Menu"
            onClick={() => setIsSheetOpen(true)}
        >
            <PersonStanding className="h-6 w-6 sm:h-5 sm:w-5" />
            <div className="hidden sm:flex flex-row min-w-max">
                Players
                <span className="hidden lg:inline-block font-mono">: {playerCount}</span>
            </div>
        </button>
    );
}

//Segmenting this into a component prevents full header rerenders
function AuthedHeaderFragment() {
    const { authData, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { setAccountModalOpen } = useAccountModal();
    const { locale, toggleLocale, t } = usePanelLocale();
    if (!authData) return null;
    const switchTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }
    const openAccountModal = () => {
        setAccountModalOpen(true);
    }
    const gotoSupportDiscord = () => {
        openExternalLink('https://discord.gg/Ec5hPDunWh');
    }
    const doLogout = () => logout();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-row items-center gap-2 sm:gap-3 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                <span className="hidden xl:block text-muted-foreground">{authData.name}</span>
                <Avatar
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-md text-2xl 
                        transition-all focus-visible:outline-none
                        hover:border-zinc-500 hover:border"
                    username={authData.name}
                    profilePicture={authData.profilePicture}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {/* <DropdownMenuLabel>Your Account</DropdownMenuLabel>
                <DropdownMenuSeparator /> */}

                {/* Don't show theme selector if on NUI, as it is broken */}
                {/* TODO: remove this when remaking the ingame menu */}
                {window.txConsts.isWebInterface && (
                    <DropdownMenuItem className="cursor-pointer" onClick={switchTheme}>
                        {theme === 'light' ? <SunIcon className="mr-2 h-4 w-4" /> : <MoonIcon className="mr-2 h-4 w-4" />}
                        {theme === 'light' ? t.lightMode : t.darkMode}
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer" onClick={toggleLocale}>
                    <LanguagesIcon className="mr-2 h-4 w-4" />
                    {locale === 'cs' ? t.switchToEnglish : t.switchToCzech}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={openAccountModal}>
                    <KeyRoundIcon className="mr-2 h-4 w-4" />
                    {t.yourAccount}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={gotoSupportDiscord}>
                    <FaDiscord size="14" className="mr-2" />
                    {t.support}
                </DropdownMenuItem>

                {/* Don't show logout if on NUI */}
                {window.txConsts.isWebInterface && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={doLogout}>
                            <LogOutIcon className="mr-2 h-4 w-4" />
                            {t.logout}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function Header() {
    return (
        <header className="sticky top-0 z-20 flex flex-col items-center justify-center
            border-b bg-card/90 text-card-foreground border-border/70 shadow-lg backdrop-blur-xl">
            <div className="h-14 lg:px-3 px-2 w-full max-w-[1920px] flex flex-row justify-between transition-all">
                <div className="flex flex-row items-center flex-grow gap-5 mr-5">
                    <div className="w-sidebar hidden xl:flex justify-center">
                        <NavLink href="/">
                            <div className="flex items-center gap-3 hover:scale-[1.02] transition-transform">
                                <DiamondCircleLogo className="h-10 w-10" />
                                <span className="flex flex-col leading-none text-left font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2ec7ff] via-[#f43cb2] to-[#f3d36b]">
                                    <span className="text-[1.05rem]">DiamondCrew</span>
                                    <span className="text-[0.78rem]">Interactive</span>
                                </span>
                            </div>
                        </NavLink>
                    </div>
                    <NavLink href="/" className="hidden sm:max-xl:block">
                        <DiamondCircleLogo className="h-9 w-9 lg:h-10 lg:w-10 hover:scale-105 transition-transform" />
                    </NavLink>

                    <div className="lg:hidden">
                        <ServerTitle />
                    </div>
                    <nav className="hidden lg:block flex-grow">
                        <DesktopNavbar />
                    </nav>
                </div>

                <div className="flex flex-row items-center gap-2 sm:gap-3">
                    <ButtonToggleServerSheet className="lg:hidden" />
                    <ButtonToggleGlobalMenu className="lg:hidden" />
                    <ButtonTogglePlayerlistSheet className="xl:hidden" />
                    <AuthedHeaderFragment />
                </div>
            </div>
        </header>
    );
}
