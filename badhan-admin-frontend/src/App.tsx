import React from 'react';
import './App.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import SignInSide from "./components/SignIn";
import StickyFooter from "./components/Home";
import {useRoutes, BrowserRouter as Router} from "react-router-dom";

const MyRoutes = () => {
    return useRoutes([
        {path: "/", element: <StickyFooter/>},
        {path: "/signin", element: <SignInSide/>},
    ]);
};

function App() {
  return (
    <div className="App">
        <Router>
            <MyRoutes />
        </Router>
    </div>
  );
}

export default App;
