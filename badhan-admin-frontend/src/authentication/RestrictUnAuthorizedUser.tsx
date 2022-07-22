import React from 'react'
import { Navigate } from "react-router-dom";
import {useSelector} from "react-redux";
import {UserProfileModel} from "../store/userProfileModel";
const RestrictUnAuthorizedUser: React.FC<{children: JSX.Element}> = ({children }) => {
    const userProfile = useSelector((state: {userProfile: UserProfileModel}) => state.userProfile);
    if (!userProfile.token) {
        return <Navigate to={'/pages/login'} replace />;
    }
    return children;
};
export default RestrictUnAuthorizedUser;

