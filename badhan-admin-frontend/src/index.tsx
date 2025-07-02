import ReactDOM from 'react-dom/client';

// third party
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import App from './App';
import { store } from './store';

// style + assets
import './assets/scss/style.scss';

// ==============================|| REACT DOM RENDER  ||============================== //

/*
Typescript also has a non-null assertion that you can use when you are sure that the value is never null by adding the ! operator to the end of your statement:
 */
const root = ReactDOM.createRoot(document.getElementById("root")!)

root.render(
    <Provider store={store}>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </Provider>
);

