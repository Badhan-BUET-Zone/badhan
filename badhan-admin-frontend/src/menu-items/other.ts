// assets
import { IconBrandChrome, IconHelp } from '@tabler/icons';
import {isPartOfMockUI} from "../utils/deployment";

// constant
const icons = { IconBrandChrome, IconHelp };

// ==============================|| SAMPLE PAGE & DOCUMENTATION MENU ITEMS ||============================== //

const other = isPartOfMockUI()?{
    id: 'sample-docs-roadmap',
    type: 'group',
    children: [
        {
            id: 'sample-page',
            title: '(x)Sample Page',
            type: 'item',
            url: '/sample-page',
            icon: icons.IconBrandChrome,
            breadcrumbs: false
        },
        {
            id: 'documentation',
            title: 'Documentation',
            type: 'item',
            url: 'https://github.com/Badhan-BUET-Zone/badhan-doc',
            icon: icons.IconHelp,
            external: true,
            target: true
        }
    ]
}:{
    id: 'sample-docs-roadmap',
    type: 'group',
    children: [
        {
            id: 'documentation',
            title: 'Documentation',
            type: 'item',
            url: 'https://github.com/Badhan-BUET-Zone/badhan-doc',
            icon: icons.IconHelp,
            external: true,
            target: true
        }
    ]
};


export default other;
