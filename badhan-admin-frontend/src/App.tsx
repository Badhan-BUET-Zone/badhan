import React from 'react';
import './App.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import SignIn from "./pages/SignIn";
import Home from "./pages/Home";
import {useRoutes, BrowserRouter as Router} from "react-router-dom";

const MyRoutes = () => {
    return useRoutes([
        {path: "/", element: <Home/>},
        {path: "/signin", element: <SignIn/>},
    ]);
};

const App = ()=>{
  return (
    <div className="App">
        <Router>
            <MyRoutes />
        </Router>
    </div>
  );
}

export default App;
