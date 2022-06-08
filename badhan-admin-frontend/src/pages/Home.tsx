import * as React from 'react';
import {Button} from "@mui/material";
import { Link } from 'react-router-dom';

export default function Home(){
    return <React.Fragment>
        <h1>Hello</h1>
        <Button component={Link} to={'/signin'}>Click me</Button>
    </React.Fragment>
}
