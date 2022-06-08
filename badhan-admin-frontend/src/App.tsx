import React from 'react';
import './App.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import SignIn from "./pages/SignIn";
import Home from "./pages/Home";
import {useRoutes, BrowserRouter as Router} from "react-router-dom";
import TopBar from "./components/TopBar";

import BackupRestore from "./pages/BackupRestore/BackupRestore";
import Contributors from "./pages/Management/Contributors";
import SuperAdmin from "./pages/Management/SuperAdmin";
import Version from "./pages/Management/Version";

const MyRoutes = () => {
    return useRoutes([
        {path: "/", element: <Home/>},
        {path: "/signin", element: <SignIn/>},
        {path: '/management/version', element: <Version/>},
        {path: '/management/contributors', element: <Contributors/>},
        {path: '/management/super-admins', element: <SuperAdmin/>},
        {path: '/backup-restore', element: <BackupRestore/>}
    ]);
};

const App = () => {
    return (
        <React.Fragment>

            <div className="App">
                <Router>
                    <TopBar/>
                    <MyRoutes/>
                </Router>
            </div>
        </React.Fragment>
    );
}

export default App;
