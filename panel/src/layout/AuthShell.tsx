import { Route, Switch } from "wouter";
import Login from "../pages/auth/Login";
import CfxreCallback from "../pages/auth/CfxreCallback";
import AddMasterPin from "../pages/auth/AddMasterPin";
import AddMasterCallback from "../pages/auth/AddMasterCallback";
import { Card } from "../components/ui/card";
import { DiamondCircleLogo } from "@/components/Logos";
import { useThemedImage } from "@/hooks/theme";
import { handleExternalLinkClick } from "@/lib/navigation";
import { AuthError } from "@/pages/auth/errors";

function AuthContentWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-center">
            {children}
        </div>
    );
}


export default function AuthShell() {
    const customLogoUrl = useThemedImage(window.txConsts.providerLogo);
    return (
        <div className="min-h-screen flex items-center justify-center pattern-dots">
            <div className="w-full min-w-[20rem] xs:max-w-[25rem] my-4 xs:mx-4">
                {customLogoUrl ? (
                    <img
                        className='max-w-36 xs:max-w-56 max-h-16 xs:max-h-24 m-auto'
                        src={customLogoUrl}
                        alt={window.txConsts.providerName}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <DiamondCircleLogo className="w-24 h-24 xs:w-28 xs:h-28" />
                        <span className="flex flex-col leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2ec7ff] via-[#f43cb2] to-[#f3d36b]">
                            <span className="text-2xl">DiamondCrew</span>
                            <span className="text-lg">Interactive</span>
                        </span>
                    </div>
                )}

                <Card className="min-h-80 mt-4 xs:mt-8 mb-4 flex items-center justify-center bg-card/40 rounded-none xs:rounded-lg">
                    <Switch>
                        <Route path="/login">
                            <Login />
                        </Route>
                        <Route path="/login/callback">
                            <AuthContentWrapper>
                                <CfxreCallback />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/addMaster/pin">
                            <AuthContentWrapper>
                                <AddMasterPin />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/addMaster/callback">
                            <AuthContentWrapper>
                                <AddMasterCallback />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/:fullPath*">
                            <AuthContentWrapper>
                                <AuthError
                                    error={{
                                        errorTitle: '404 | Not Found',
                                        errorMessage: 'Something went wrong.',
                                    }}
                                />
                            </AuthContentWrapper>
                        </Route>
                    </Switch>
                </Card>

                <div className="mx-auto flex flex-wrap gap-4 justify-center mb-2">
                    <a
                        href='https://discord.gg/uAmsGa2'
                        onClick={handleExternalLinkClick}
                        target='_blank'
                        className='w-48 h-16 relative group shadow-sm opacity-90 hover:opacity-100 brightness-110
                        dark:brightness-95 dark:hover:brightness-110'
                    >
                        <div className='absolute inset-0 -z-10 animate-pulse blur 
                        scale-0 group-hover:scale-100 transition-transform bg-black
                        dark:bg-gradient-to-t dark:from-[#8567EC] dark:to-[#BD5CBF]' />
                        <img
                            className='rounded-lg max-w-48 max-h-16 m-auto'
                            src="img/discord.png"
                        />
                    </a>
                </div>

                <div className="text-center text-muted-foreground text-sm font-light">
                    tx: <strong>v{window.txConsts.txaVersion}</strong>
                    &nbsp;|
                    fx: <strong>b{window.txConsts.fxsVersion}</strong>
                </div>
            </div>
        </div>
    );
}
