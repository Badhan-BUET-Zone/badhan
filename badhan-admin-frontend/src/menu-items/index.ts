import dashboard from './dashboard';
import pages from './pages';
import utilities from './utilities';
import other from './other';
import {isPartOfMockUI} from "../utils/deployment";

// ==============================|| MENU ITEMS ||============================== //

const menuItems = isPartOfMockUI()?{
    items: [dashboard, pages, utilities, other]
}:{
    items: [dashboard, pages, other]
};

export default menuItems;
