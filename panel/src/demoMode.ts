import { DiscordBotStatus, FxMonitorHealth, TxConfigState } from '@shared/enums';
import type { DashboardDataEventType, GlobalStatusType, ListenEventsMap, PlayerlistPlayerType } from '@shared/socketioTypes';
import type { PerfChartApiSuccessResp } from '@shared/otherTypes';

export const isDemoMode = () => {
    return new URLSearchParams(window.location.search).get('demo') === '1';
};

export const setupDemoMode = () => {
    if (!isDemoMode()) return;

    window.document.documentElement.classList.add('dark');
    window.document.documentElement.classList.remove('light');
    if (window.txConsts) return;

    window.txConsts = {
        fxsVersion: '12882',
        fxsOutdated: undefined,
        txaVersion: '9.9.9-diamond-demo',
        txaOutdated: undefined,
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isWindows: navigator.platform.toLowerCase().includes('win'),
        isWebInterface: true,
        showAdvanced: true,
        hasMasterAccount: true,
        defaultTheme: 'dark',
        customThemes: [],
        providerLogo: undefined,
        providerName: undefined,
        hostConfigSource: 'demo',
        server: {
            name: 'DiamondCrew Interactive',
            game: 'fivem',
            icon: undefined,
        },
        preAuth: {
            name: 'DiamondCrew Admin',
            permissions: ['all_permissions'],
            isMaster: true,
            isTempPassword: false,
            csrfToken: 'demo-csrf-token',
        },
    };
};

const demoPlayers: PlayerlistPlayerType[] = [
    'ZeroCool', 'Niky', 'Adam', 'Laura', 'Tom', 'Mia', 'Kuba', 'Sima',
    'Rider', 'Neo', 'Alex', 'Viktor', 'Sofia', 'Patrik', 'Ema', 'Dominik',
    'Natalie', 'Martin', 'Crystal', 'Shadow', 'Luna', 'David', 'Tereza', 'Roman',
].map((name, index) => ({
    netid: index + 1,
    displayName: name,
    pureName: name.toLowerCase(),
    license: `license:demo${String(index + 1).padStart(4, '0')}`,
}));

const demoStatus: GlobalStatusType = {
    configState: TxConfigState.Ready,
    discord: DiscordBotStatus.Ready,
    runner: {
        isIdle: false,
        isChildAlive: true,
    },
    server: {
        name: 'DiamondCrew Interactive',
        uptime: 14 * 60 * 60 * 1000 + 22 * 60 * 1000,
        health: FxMonitorHealth.ONLINE,
        healthReason: 'Demo server is online and accepting connections.',
        whitelist: 'disabled',
    },
    scheduler: {
        nextRelativeMs: 2 * 60 * 60 * 1000,
        nextSkip: false,
        nextIsTemp: false,
    },
};

const demoPerfBoundaries = [
    0.001, 0.002, 0.004, 0.006, 0.008,
    0.010, 0.015, 0.020, 0.030, 0.050,
    0.070, 0.100, 0.150, 0.250, '+Inf',
] as const;

const makePerfCounts = (seed: number) => (
    [8, 22, 48, 76, 112, 148, 126, 94, 58, 30, 16, 9, 4, 2, 1]
        .map((value, index) => value + seed + (index % 4) * 3)
);

const makeThreadPerf = (seed: number) => {
    const buckets = makePerfCounts(seed);
    return {
        count: buckets.reduce((sum, bucket) => sum + bucket, 0),
        buckets,
        sum: buckets.reduce((sum, bucket, index) => sum + bucket * (index + 1), 0),
    };
};

const demoDashboard: DashboardDataEventType = {
    svRuntime: {
        fxsMemory: 684.42,
        nodeMemory: {
            used: 142.18,
            limit: 512,
        },
        perfBoundaries: [...demoPerfBoundaries],
        perfBucketCounts: {
            svMain: makePerfCounts(0),
            svSync: makePerfCounts(7),
            svNetwork: makePerfCounts(14),
        },
    },
    playerDrop: {
        summaryLast6h: [
            ['quit', 16],
            ['timeout', 7],
            ['crash', 3],
            ['kick', 2],
        ],
    },
};

const makeDemoPerfChart = (threadName: 'svMain' | 'svSync' | 'svNetwork'): PerfChartApiSuccessResp => {
    const now = Date.now();
    const threadSeed = threadName === 'svMain' ? 0 : threadName === 'svSync' ? 7 : 14;
    const threadPerfLog: PerfChartApiSuccessResp['threadPerfLog'] = [{
        type: 'svBoot',
        ts: now - 26 * 60 * 60 * 1000,
        duration: 1842,
    }];

    for (let i = 72; i >= 0; i--) {
        const wave = Math.round(Math.sin(i / 6) * 9);
        const drift = Math.round(i / 8);
        threadPerfLog.push({
            type: 'data',
            ts: now - i * 20 * 60 * 1000,
            players: 86 + wave + drift,
            fxsMemory: 620 + wave * 2 + drift,
            nodeMemory: 126 + wave + drift / 2,
            perf: makeThreadPerf(threadSeed + Math.max(0, wave)),
        });
    }

    return {
        boundaries: [...demoPerfBoundaries],
        threadPerfLog,
    };
};

type DemoHandler = (...args: any[]) => void;

export const createDemoSocket = () => {
    const handlers = new Map<string, DemoHandler[]>();
    let disconnected = false;

    const emit = <EventName extends keyof ListenEventsMap>(event: EventName, ...args: Parameters<ListenEventsMap[EventName]>) => {
        if (disconnected) return;
        handlers.get(event)?.forEach((handler) => handler(...args));
    };

    const socket = {
        on: (event: string, handler: DemoHandler) => {
            const eventHandlers = handlers.get(event) ?? [];
            eventHandlers.push(handler);
            handlers.set(event, eventHandlers);
            return socket;
        },
        removeAllListeners: () => {
            handlers.clear();
            return socket;
        },
        disconnect: () => {
            disconnected = true;
            return socket;
        },
    };

    window.setTimeout(() => {
        emit('connect');
        emit('status', demoStatus);
        emit('playerlist', [{
            type: 'fullPlayerlist',
            mutex: 'DEMO1',
            playerlist: demoPlayers,
        }]);
        emit('dashboard', demoDashboard);
    }, 150);

    return socket;
};

export const getDemoApiResponse = (path: string) => {
    if (path.startsWith('/perfChartData/')) {
        const thread = path.split('/').filter(Boolean).at(1);
        if (thread === 'svSync' || thread === 'svNetwork') {
            return makeDemoPerfChart(thread);
        }
        return makeDemoPerfChart('svMain');
    }
    if (path.startsWith('/fxserver/controls') || path.startsWith('/fxserver/commands')) {
        return {
            type: 'success',
            msg: 'Demo mode: action simulated.',
        };
    }
    return undefined;
};
