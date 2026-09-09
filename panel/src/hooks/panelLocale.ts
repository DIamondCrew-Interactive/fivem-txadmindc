import { LocalStorageKey } from "@/lib/localStorage";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type PanelLocale = "cs" | "en";

const getInitialLocale = (): PanelLocale => {
    const browserLocale = window.txBrowserLocale;
    const firstLocale = (Array.isArray(browserLocale) ? browserLocale[0] : browserLocale) ?? navigator.language;
    return firstLocale?.toLowerCase().startsWith("cs") ? "cs" : "en";
};

const panelLocaleAtom = atomWithStorage<PanelLocale>(
    LocalStorageKey.PanelLanguage,
    getInitialLocale(),
);

export const isCzechPanelAtom = atom((get) => get(panelLocaleAtom) === "cs");

const dictionary = {
    cs: {
        lightMode: "Světlý režim",
        darkMode: "Tmavý režim",
        yourAccount: "Tvůj účet",
        support: "Podpora",
        logout: "Odhlásit",
        switchToEnglish: "English",
        switchToCzech: "Čeština",
        announcementTitle: "Oznámení serveru",
        announcementDescription: "Vyber, jak se zpráva doručí online hráčům.",
        delivery: "Doručení",
        serverAnnouncement: "Oznámení serveru",
        gksphoneNotification: "gksphone notifikace",
        gtaNotification: "GTA Online notifikace",
        message: "Zpráva",
        announcementPlaceholder: "Napiš oznámení...",
        color: "Barva",
        logoUrl: "URL loga",
        phoneType: "Typ v telefonu",
        preview: "Náhled oznámení",
        send: "Odeslat",
        sendingAnnouncement: "Odesílám oznámení...",
        kickAllPlayers: "Vyhodit všechny hráče",
        kickReasonMessage: "Napiš důvod vyhození, nebo nech pole prázdné.",
        kickReasonPlaceholder: "důvod vyhození",
        kickingPlayers: "Vyhazuji hráče...",
        startServer: "Spustit server",
        stopServer: "Vypnout server",
        noControlPerms: "Nemáš oprávnění ovládat server.",
        restartServer: "Restartovat server",
        sendAnnouncement: "Poslat oznámení",
        noAnnouncementPerms: "Nemáš oprávnění posílat oznámení.",
    },
    en: {
        lightMode: "Light Mode",
        darkMode: "Dark Mode",
        yourAccount: "Your Account",
        support: "Support",
        logout: "Logout",
        switchToEnglish: "English",
        switchToCzech: "Čeština",
        announcementTitle: "Server Announcement",
        announcementDescription: "Choose how the message should be delivered to online players.",
        delivery: "Delivery",
        serverAnnouncement: "Server announcement",
        gksphoneNotification: "gksphone notification",
        gtaNotification: "GTA Online notification",
        message: "Message",
        announcementPlaceholder: "Write announcement...",
        color: "Color",
        logoUrl: "Logo URL",
        phoneType: "Phone type",
        preview: "Announcement preview",
        send: "Send",
        sendingAnnouncement: "Sending announcement...",
        kickAllPlayers: "Kick All Players",
        kickReasonMessage: "Type the kick reason or leave it blank.",
        kickReasonPlaceholder: "kick reason",
        kickingPlayers: "Kicking players...",
        startServer: "Start the server",
        stopServer: "Stop the server",
        noControlPerms: "You do not have permission to control the server.",
        restartServer: "Restart Server",
        sendAnnouncement: "Send Announcement",
        noAnnouncementPerms: "You do not have permission to send an Announcement.",
    },
} as const;

export const usePanelLocale = () => {
    const locale = useAtomValue(panelLocaleAtom);
    const setLocale = useSetAtom(panelLocaleAtom);
    return {
        locale,
        setLocale,
        toggleLocale: () => setLocale(locale === "cs" ? "en" : "cs"),
        t: dictionary[locale],
    };
};
