import { KickAllIcon } from '@/components/KickIcons';
import { fxRunnerStateAtom, txConfigStateAtom } from '@/hooks/status';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { useAtomValue } from 'jotai';
import { MegaphoneIcon, PowerIcon, PowerOffIcon, RotateCcwIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { useOpenConfirmDialog, useOpenPromptDialog } from '@/hooks/dialogs';
import { ApiTimeout, useBackendApi } from '@/hooks/fetch';
import { useCloseAllSheets } from '@/hooks/sheets';
import { useAdminPerms } from '@/hooks/auth';
import { usePanelLocale } from '@/hooks/panelLocale';
import { TxConfigState } from '@shared/enums';
import { useState, type FormEvent } from 'react';

type AnnouncementMode = 'server' | 'gksphone' | 'gta';
type PhoneNotificationType = 'success' | 'info' | 'warning' | 'error';

type AnnouncementPayload = {
    mode: AnnouncementMode;
    message: string;
    color: string;
    logo: string;
    phoneType: PhoneNotificationType;
};


const controlButtonsVariants = cva(
    `h-10 sm:h-8 rounded-md transition-colors
    flex flex-grow items-center justify-center flex-shrink-0
    border bg-muted shadow-sm

    focus:outline-none disabled:opacity-50 ring-offset-background  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`,
    {
        variants: {
            type: {
                default: "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                destructive: "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
                warning: "hover:bg-warning hover:text-warning-foreground hover:border-warning",
                success: "hover:bg-success hover:text-success-foreground hover:border-success",
                info: "hover:bg-info hover:text-info-foreground hover:border-info",
            },
        },
        defaultVariants: {
            type: "default",
        },
    }
);

function AnnouncementDialog({
    open,
    onOpenChange,
    canCustomize,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canCustomize: boolean;
    onSubmit: (payload: AnnouncementPayload) => void;
}) {
    const { t } = usePanelLocale();
    const [mode, setMode] = useState<AnnouncementMode>('server');
    const [message, setMessage] = useState('');
    const [color, setColor] = useState('#F43CB2');
    const [logo, setLogo] = useState('images/diamond-circle-logo.png');
    const [phoneType, setPhoneType] = useState<PhoneNotificationType>('success');

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const cleanMessage = message.trim();
        if (!cleanMessage) return;
        onSubmit({
            mode,
            message: cleanMessage,
            color,
            logo,
            phoneType,
        });
        setMessage('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{t.announcementTitle}</DialogTitle>
                        <DialogDescription>
                            {t.announcementDescription}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>{t.delivery}</Label>
                                <Select value={mode} onValueChange={(value) => setMode(value as AnnouncementMode)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="server">{t.serverAnnouncement}</SelectItem>
                                        <SelectItem value="gksphone">{t.gksphoneNotification}</SelectItem>
                                        <SelectItem value="gta">{t.gtaNotification}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="announcement-message">{t.message}</Label>
                                <AutosizeTextarea
                                    id="announcement-message"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder={t.announcementPlaceholder}
                                    minHeight={110}
                                    maxHeight={220}
                                    required
                                    autoFocus
                                />
                            </div>

                            {canCustomize && (
                                <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                                    <div className="grid gap-2">
                                        <Label htmlFor="announcement-color">{t.color}</Label>
                                        <Input
                                            id="announcement-color"
                                            type="color"
                                            value={color}
                                            onChange={(event) => setColor(event.target.value)}
                                            className="h-10 p-1"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="announcement-logo">{t.logoUrl}</Label>
                                        <Input
                                            id="announcement-logo"
                                            value={logo}
                                            onChange={(event) => setLogo(event.target.value)}
                                            placeholder="images/diamond-circle-logo.png"
                                        />
                                    </div>
                                    {mode === 'gksphone' && (
                                        <div className="grid gap-2 sm:col-span-2">
                                            <Label>{t.phoneType}</Label>
                                            <Select value={phoneType} onValueChange={(value) => setPhoneType(value as PhoneNotificationType)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="success">success</SelectItem>
                                                    <SelectItem value="info">info</SelectItem>
                                                    <SelectItem value="warning">warning</SelectItem>
                                                    <SelectItem value="error">error</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border bg-muted/60 p-3 flex flex-col items-center gap-3">
                            <img
                                src={logo}
                                alt=""
                                className="size-16 rounded-full object-contain"
                                onError={(event) => {
                                    event.currentTarget.style.visibility = 'hidden';
                                }}
                            />
                            <div
                                className="w-full rounded-md border p-3 text-sm"
                                style={{ borderColor: color, boxShadow: `inset 3px 0 0 ${color}` }}
                            >
                                <div className="font-semibold">DiamondCrew</div>
                                <div className="text-muted-foreground break-words">
                                    {message || t.preview}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit">{t.send}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ServerControls() {
    const txConfigState = useAtomValue(txConfigStateAtom);
    const fxRunnerState = useAtomValue(fxRunnerStateAtom);
    const openConfirmDialog = useOpenConfirmDialog();
    const openPromptDialog = useOpenPromptDialog();
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    const closeAllSheets = useCloseAllSheets();
    const { hasPerm } = useAdminPerms();
    const { t } = usePanelLocale();
    const fxsControlApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/controls'
    });
    const fxsCommandsApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/commands'
    });

    const handleServerControl = (action: 'start' | 'stop' | 'restart') => {
        const messageMap = {
            start: 'Starting server',
            stop: 'Stopping server',
            restart: 'Restarting server',
        }
        const toastLoadingMessage = `${messageMap[action]}...`;
        const callApi = () => {
            closeAllSheets();
            fxsControlApi({
                data: { action },
                toastLoadingMessage,
                timeout: ApiTimeout.LONG,
            });
        }
        if (action === 'start') {
            callApi();
        } else {
            openConfirmDialog({
                title: messageMap[action],
                message: `Are you sure you want to ${action} the server?`,
                onConfirm: callApi,
            });
        }
    }
    const handleStartStop = () => {
        handleServerControl(fxRunnerState.isIdle ? 'start' : 'stop');
    }
    const handleRestart = () => {
        if (!fxRunnerState.isChildAlive) return;
        handleServerControl('restart');
    }

    const handleAnnounce = (payload: AnnouncementPayload) => {
        closeAllSheets();
        setAnnouncementOpen(false);
        fxsCommandsApi({
            data: { action: 'admin_broadcast', parameter: JSON.stringify(payload) },
            toastLoadingMessage: t.sendingAnnouncement,
        });
    }

    const handleKickAll = () => {
        if (!fxRunnerState.isChildAlive) return;
        openPromptDialog({
            title: t.kickAllPlayers,
            message: t.kickReasonMessage,
            placeholder: t.kickReasonPlaceholder,
            submitLabel: t.send,
            onSubmit: (input) => {
                closeAllSheets();
                fxsCommandsApi({
                    data: { action: 'kick_all', parameter: input },
                    toastLoadingMessage: t.kickingPlayers,
                });
            }
        });
    }

    const hasControlPerms = hasPerm('control.server');
    const hasAnnouncementPerm = hasPerm('announcement');
    const canCustomizeAnnouncement = hasPerm('all_permissions');

    if (txConfigState !== TxConfigState.Ready) {
        return (
            <div className='w-full h-8 text-center tracking-wider font-light opacity-75'>
                Server not configured.
            </div>
        )
    }
    return (
        <div className="flex flex-row justify-between gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    {fxRunnerState.isIdle ? (
                        <div className="relative flex flex-grow inset-0">
                            <div className='absolute inset-0 bg-success animate-pulse rounded blur-sm'></div>
                            <button
                                onClick={handleStartStop}
                                className={cn(controlButtonsVariants({ type: 'success' }), 'relative')}
                                disabled={!hasControlPerms}
                            >
                                <PowerIcon className='h-5' />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartStop}
                            className={controlButtonsVariants({ type: 'destructive' })}
                            disabled={!hasControlPerms}
                        >
                            <PowerOffIcon className='h-5' />
                        </button>
                    )}
                </TooltipTrigger>
                <TooltipContent className={cn(!hasControlPerms && 'text-destructive-inline text-center')}>
                    {hasControlPerms ? (
                        <p>{fxRunnerState.isIdle ? t.startServer : t.stopServer}</p>
                    ) : (
                        <p>
                            {t.noControlPerms}
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleRestart}
                        className={cn(controlButtonsVariants({ type: 'warning' }))}
                        disabled={!hasControlPerms || !fxRunnerState.isChildAlive}
                    >
                        <RotateCcwIcon className='h-5' />
                    </button>
                </TooltipTrigger>
                <TooltipContent className={cn(!hasControlPerms && 'text-destructive-inline text-center')}>
                    {hasControlPerms ? (
                        <p>{t.restartServer}</p>
                    ) : (
                        <p>
                            {t.noControlPerms}
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleKickAll}
                        className={controlButtonsVariants()}
                        disabled={!hasControlPerms || !fxRunnerState.isChildAlive}
                    >
                        <KickAllIcon style={{ height: '1.25rem', width: '1.5rem', fill: 'currentcolor' }} />
                    </button>
                </TooltipTrigger>
                <TooltipContent className={cn(!hasControlPerms && 'text-destructive-inline text-center')}>
                    {hasControlPerms ? (
                        <p>{t.kickAllPlayers}</p>
                    ) : (
                        <p>
                            {t.noControlPerms}
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setAnnouncementOpen(true)}
                        className={controlButtonsVariants()}
                        disabled={!hasAnnouncementPerm || !fxRunnerState.isChildAlive}
                    >
                        <MegaphoneIcon className='h-5' />
                    </button>
                </TooltipTrigger>
                <TooltipContent className={cn(!hasAnnouncementPerm && 'text-destructive-inline text-center')}>
                    {hasAnnouncementPerm ? (
                        <p>{t.sendAnnouncement}</p>
                    ) : (
                        <p>
                            {t.noAnnouncementPerms}
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <AnnouncementDialog
                open={announcementOpen}
                onOpenChange={setAnnouncementOpen}
                canCustomize={canCustomizeAnnouncement}
                onSubmit={handleAnnounce}
            />
        </div>
    );
}
