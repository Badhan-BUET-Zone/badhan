import { lazy } from 'react';

// project imports
import Loadable from '../ui-component/Loadable';
import loadable from "../ui-component/Loadable";

const MainLayout  = loadable(lazy(()=> import('../layout/MainLayout')))
const Contributors = loadable(lazy(()=> import('../views/management/Contributors')))
const SuperAdmin = loadable(lazy(()=> import('../views/management/SuperAdmin')))
const BackupRestore = loadable(lazy(()=> import('../views/backup-restore')))
const Version = Loadable(lazy(() => import('../views/management/Version')));

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('../views/dashboard/Default')));

// utilities routing
const UtilsTypography = Loadable(lazy(() => import('../views/utilities/Typography')));
const UtilsColor = Loadable(lazy(() => import('../views/utilities/Color')));
const UtilsShadow = Loadable(lazy(() => import('../views/utilities/Shadow')));
const UtilsMaterialIcons = Loadable(lazy(() => import('../views/utilities/MaterialIcons')));
const UtilsTablerIcons = Loadable(lazy(() => import('../views/utilities/TablerIcons')));

// sample page routing
const SamplePage = Loadable(lazy(() => import('../views/sample-page')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: <DashboardDefault />
        },
        {
            path: '/dashboard/default',
            element: <DashboardDefault />
        },
        {
            path: '/utils/util-typography',
            element: <UtilsTypography />
        },
        {
            path: '/utils/util-color',
            element: <UtilsColor />
        },
        {
            path: '/utils/util-shadow',
            element: <UtilsShadow />
        },
        {
            path: '/icons/tabler-icons',
            element: <UtilsTablerIcons />
        },
        {
            path: '/icons/material-icons',
            element: <UtilsMaterialIcons />
        },
        {
            path: '/sample-page',
            element: <SamplePage />
        },
        {
            path: '/management/version',
            element: <Version/>
        },
        {
            path: '/management/contributors',
            element: <Contributors/>
        },
        {
            path: '/management/superadmin',
            element: <SuperAdmin/>
        },
        {
            path: '/backup-restore',
            element: <BackupRestore/>,
        }
    ]
};

export default MainRoutes;
