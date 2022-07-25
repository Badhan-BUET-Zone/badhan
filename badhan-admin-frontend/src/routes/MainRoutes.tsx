import { lazy } from 'react';

// project imports
import Loadable from '../ui-component/Loadable';
import loadable from "../ui-component/Loadable";
import RestrictUnAuthorizedUser from "../authentication/RestrictUnAuthorizedUser";

const MainLayout  = loadable(lazy(()=> import('../layout/MainLayout')))
const Contributors = loadable(lazy(()=> import('../views/management/Contributors')))
const SuperAdmin = loadable(lazy(()=> import('../views/management/SuperAdmin')))
const BackupRestore = loadable(lazy(()=> import('../views/backup-restore')))
const Version = Loadable(lazy(() => import('../views/management/Version')));

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('../views/dashboard/Default')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: <RestrictUnAuthorizedUser><DashboardDefault /></RestrictUnAuthorizedUser>
        },
        {
            path: '/dashboard/default',
            element: <RestrictUnAuthorizedUser><DashboardDefault /></RestrictUnAuthorizedUser>
        },
        {
            path: '/management/version',
            element: <RestrictUnAuthorizedUser><Version/></RestrictUnAuthorizedUser>
        },
        {
            path: '/management/contributors',
            element: <RestrictUnAuthorizedUser><Contributors/></RestrictUnAuthorizedUser>
        },
        {
            path: '/management/superadmin',
            element: <RestrictUnAuthorizedUser><SuperAdmin/></RestrictUnAuthorizedUser>
        },
        {
            path: '/backup-restore',
            element: <RestrictUnAuthorizedUser><BackupRestore/></RestrictUnAuthorizedUser>,
        }
    ]
};

export default MainRoutes;
