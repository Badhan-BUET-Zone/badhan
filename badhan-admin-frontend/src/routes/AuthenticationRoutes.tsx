import { lazy } from 'react';

// project imports
import Loadable from '../ui-component/Loadable';
import MinimalLayout from '../layout/MinimalLayout';
import RestrictAuthorizedUser from "../authentication/RestrictAuthorizedUser";

// login option 3 routing
const AuthLogin3 = Loadable(lazy(() => import('../views/pages/authentication/authentication3/Login3')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const AuthenticationRoutes = {
    path: '/',
    element: <RestrictAuthorizedUser><MinimalLayout/></RestrictAuthorizedUser>,
    children: [
        {
            path: '/pages/login',
            element: <AuthLogin3 />
        },
    ]
};

export default AuthenticationRoutes;
