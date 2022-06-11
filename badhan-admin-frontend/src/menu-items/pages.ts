// assets
import { IconKey, IconServer, IconBook } from '@tabler/icons';

// constant
const icons = {
    IconKey,
    IconServer,
    IconBook
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const pages = {
    id: 'pages',
    title: 'Pages',
    caption: 'Pages Caption',
    type: 'group',
    children: [
        {
            id: 'management',
            title: 'Management',
            type: 'collapse',
            icon: icons.IconServer,

            children: [
                {
                    id: 'version',
                    title: 'App Version',
                    type: 'item',
                    url: '/management/version',
                },
                {
                    id: 'contributors',
                    title: 'Contributors',
                    type: 'item',
                    url: '/management/contributors',
                },
                {
                    id: 'superadmins',
                    title: 'Super Admins',
                    type: 'item',
                    url: '/management/superadmin',
                }
            ]
        },
        {
            id: 'backup-restore',
            title: 'Backup and Restore',
            type: 'item',
            icon: icons.IconBook,
            url: '/backup-restore'
        },
        {
            id: 'authentication',
            title: 'Authentication',
            type: 'collapse',
            icon: icons.IconKey,

            children: [
                {
                    id: 'login3',
                    title: 'Login',
                    type: 'item',
                    url: '/pages/login/login3',
                    target: true
                },
                {
                    id: 'register3',
                    title: '(x)Register',
                    type: 'item',
                    url: '/pages/register/register3',
                    target: true
                }
            ]
        }
    ]
};

export default pages;
